# Email System Redesign Design

**Date:** 2026-03-11
**Status:** Approved (rev 2)
**Scope:** Fix password reset email, centralise Brevo config, add trip share notification, add accommodation cancellation reminders, add transport booking window reminders via APScheduler daily job.

---

## Context

The Brevo email integration shipped in PR #35 implements `send_password_reset_email` but the Brevo template does not inject `{{ params.RESET_LINK }}` — users receive a generic email with no reset link. This redesign fixes that, centralises all Brevo configuration, and adds three new email types: trip share notification, accommodation cancellation reminder, and transport booking window reminder.

---

## Architecture Overview

```
app/core/email_config.py          ← new: centralised Brevo env var config
app/services/email_service.py     ← extend: 3 new send_* functions, import from email_config
app/services/reminder_service.py  ← new: daily reminder query logic
app/main.py                       ← wire APScheduler on startup/shutdown
app/models/accommodation.py       ← add: cancel_reminder_sent Boolean
app/models/trip_transport.py      ← add: booking_reminder_sent Boolean
app/routers/trips.py              ← extend: call send_trip_share_email on share creation
migrations/                       ← new migration for both columns
requirements.txt                  ← add apscheduler
docs/deployment.md                ← document 3 new env vars
tests/test_email_service.py       ← extend: tests for 3 new functions
tests/test_reminder_service.py    ← new: tests for daily job logic
```

### Email Types

| Type | Trigger | Template params |
|---|---|---|
| Password reset | `forgot_password` endpoint | `RESET_LINK` |
| Trip share | share record created | `TRIP_NAME`, `SHARED_BY`, `TRIP_URL` |
| Accommodation reminder | daily job, 3 days before `cancel_by_date` | `ACCOMMODATION_NAME`, `CANCEL_BY_DATE`, `TRIP_NAME`, `APP_URL` |
| Transport booking window | daily job, 90 days before departure | `TRANSPORT_TYPE`, `ORIGIN`, `DESTINATION`, `DEPARTURE_DATE`, `TRIP_NAME`, `APP_URL` |

---

## Section 1: Email Config Module

New file `app/core/email_config.py` — reads all Brevo env vars in one place. All other modules import from here; no scattered `os.getenv` calls.

```python
# app/core/email_config.py
import os

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Travel Planner")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

TEMPLATE_PASSWORD_RESET = int(os.getenv("BREVO_TEMPLATE_PASSWORD_RESET", "0"))
TEMPLATE_TRIP_SHARE = int(os.getenv("BREVO_TEMPLATE_TRIP_SHARE", "0"))
TEMPLATE_ACCOMMODATION_REMINDER = int(os.getenv("BREVO_TEMPLATE_ACCOMMODATION_REMINDER", "0"))
TEMPLATE_TRANSPORT_BOOKING_REMINDER = int(os.getenv("BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER", "0"))
```

If `BREVO_API_KEY` is not set, all send functions log a warning and return without sending. The app runs normally without email configured (local dev).

### New Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BREVO_TEMPLATE_PASSWORD_RESET` | No* | Integer template ID for password reset (already existed; now read from email_config, not inline os.getenv) |
| `BREVO_TEMPLATE_TRIP_SHARE` | No* | Integer template ID for trip share notification |
| `BREVO_TEMPLATE_ACCOMMODATION_REMINDER` | No* | Integer template ID for cancellation reminder |
| `BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER` | No* | Integer template ID for booking window reminder |

*Required for that email type to send. Missing template ID causes a warning log and skip — not a crash.

---

## Section 2: Brevo Templates

Four templates to create in the Brevo dashboard. All use `{{ params.VARIABLE }}` syntax.

### Template 1: Password Reset (fix existing)

**Subject:** `Reset your Travel Planner password`

```
Hi,

You requested a password reset for your Travel Planner account.

Click the link below to reset your password. This link expires in 1 hour.

{{ params.RESET_LINK }}

If you didn't request this, you can safely ignore this email.
```

### Template 2: Trip Share Notification (new)

**Subject:** `{{ params.SHARED_BY }} shared a trip with you`

```
Hi,

{{ params.SHARED_BY }} has shared their trip "{{ params.TRIP_NAME }}" with you on Travel Planner.

View the trip here:
{{ params.TRIP_URL }}
```

### Template 3: Accommodation Cancellation Reminder (new)

**Subject:** `Reminder: cancel {{ params.ACCOMMODATION_NAME }} by {{ params.CANCEL_BY_DATE }}`

```
Hi,

This is a reminder that your free cancellation window for {{ params.ACCOMMODATION_NAME }}
closes on {{ params.CANCEL_BY_DATE }}.

This accommodation is part of your trip: {{ params.TRIP_NAME }}.

Log in to manage your booking:
{{ params.APP_URL }}
```

### Template 4: Transport Booking Window (new)

**Subject:** `Booking now open: {{ params.ORIGIN }} → {{ params.DESTINATION }}`

```
Hi,

Tickets are now available for your {{ params.TRANSPORT_TYPE }} from
{{ params.ORIGIN }} to {{ params.DESTINATION }} on {{ params.DEPARTURE_DATE }}.

This is part of your trip: {{ params.TRIP_NAME }}.

Log in to add your booking reference:
{{ params.APP_URL }}
```

---

## Section 3: Data Model Changes

### `app/models/accommodation.py`

Add one column:

```python
cancel_reminder_sent = Column(Boolean, nullable=False, default=False)
```

Set to `True` after the cancellation reminder email is sent. Prevents duplicate emails on subsequent daily job runs.

### `app/models/trip_transport.py`

Add one column:

```python
booking_reminder_sent = Column(Boolean, nullable=False, default=False)
```

Set to `True` after the booking window reminder is sent. One email per transport leg, ever.

### Migration

New script in `migrations/` — adds both columns with `DEFAULT FALSE`. Compatible with SQLite and Postgres.

---

## Section 4: APScheduler Daily Job

### Dependency

Add `apscheduler` to `requirements.txt`.

### `app/services/reminder_service.py` (new)

Single function `send_due_reminders(db: Session)` — handles both reminder types in one pass.

**Accommodation reminder logic:**
- Query: `cancel_by_date >= today AND cancel_by_date <= today + 3 days`, `cancel_reminder_sent == False`
- Lower bound is inclusive (`>= today`) so deadlines falling on today are included. Records where `cancel_by_date < today` are excluded — the cancellation window has already closed and no reminder is useful.
- Join to `Trip` → `User` to get the owner's email
- Send `send_accommodation_reminder_email` for each result
- Set `cancel_reminder_sent = True`, commit

**Transport booking window logic:**
- Query: `transport_type IN ('train', 'bus', 'ferry')`, `booked == False`, `booking_reminder_sent == False`
- **Inner join** to `TripDay` on `departure_day_id`: only transport records with an assigned departure day are included. Transport legs where `departure_day_id IS NULL` have no known date and are silently skipped.
- Filter: `TripDay.date > today AND TripDay.date <= today + 90 days` (lower bound is exclusive — a departure today is too late to act on a booking window reminder)
- Join to `Trip` → `User` to get the owner's email
- Send `send_transport_booking_reminder_email` for each result
- Set `booking_reminder_sent = True`, commit

### `app/main.py` — Scheduler wiring

```python
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app):
    scheduler.add_job(run_reminders, "cron", hour=8, minute=0, timezone="UTC")
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

Note: uses the `lifespan` context manager pattern (FastAPI 0.93+) rather than the deprecated `@app.on_event` decorator. Scheduler fires at 08:00 UTC daily.

`run_reminders` opens its own DB session, calls `send_due_reminders(db)`, closes the session.

---

## Section 5: Email Service Functions

Three new functions added to `app/services/email_service.py`. All follow the same pattern as the existing `send_password_reset_email` — graceful skip if `BREVO_API_KEY` is unset, `ApiException` (`brevo_python.rest.ApiException`) logged and re-raised.

```python
def send_trip_share_email(
    to_email: str, trip_name: str, shared_by: str, trip_url: str
) -> None:
    """Notify a user that a trip has been shared with them."""
    # template: TEMPLATE_TRIP_SHARE
    # params: TRIP_NAME, SHARED_BY, TRIP_URL

def send_accommodation_reminder_email(
    to_email: str, accommodation_name: str, cancel_by_date: str, trip_name: str
) -> None:
    """Remind a user their free cancellation window is closing."""
    # template: TEMPLATE_ACCOMMODATION_REMINDER
    # params: ACCOMMODATION_NAME, CANCEL_BY_DATE, TRIP_NAME, APP_URL
    # APP_URL is read internally from email_config.FRONTEND_URL — not a caller-supplied argument

def send_transport_booking_reminder_email(
    to_email: str, transport_type: str, origin: str,
    destination: str, departure_date: str, trip_name: str
) -> None:
    """Notify a user that booking is now open for an unbooked transport leg."""
    # template: TEMPLATE_TRANSPORT_BOOKING_REMINDER
    # params: TRANSPORT_TYPE, ORIGIN, DESTINATION, DEPARTURE_DATE, TRIP_NAME, APP_URL
    # APP_URL is read internally from email_config.FRONTEND_URL — not a caller-supplied argument
```

`APP_URL` in the two reminder functions is sourced from `email_config.FRONTEND_URL` inside the function — not passed by the caller.

### Call Sites

- `send_trip_share_email` — `app/routers/trips.py`, inside `create_trip_share`, after the share record is committed. The call is wrapped in `try/except Exception` and the exception is logged and swallowed — the share has already been persisted and a 500 from an email failure would mislead the client.
- `send_accommodation_reminder_email` — `app/services/reminder_service.py`
- `send_transport_booking_reminder_email` — `app/services/reminder_service.py`

---

## Testing

### `tests/test_email_service.py` (extend)

- `test_send_trip_share_email_calls_brevo_with_correct_params`
- `test_send_accommodation_reminder_email_calls_brevo_with_correct_params`
- `test_send_transport_booking_reminder_email_calls_brevo_with_correct_params`
- All three skip gracefully when `BREVO_API_KEY` is unset

### `tests/test_reminder_service.py` (new)

- `test_sends_accommodation_reminder_when_cancel_by_date_within_3_days`
- `test_does_not_resend_accommodation_reminder_already_sent`
- `test_does_not_send_accommodation_reminder_outside_window`
- `test_does_not_send_accommodation_reminder_when_cancel_by_date_is_past`
- `test_sends_transport_reminder_when_departure_within_90_days_and_unbooked`
- `test_does_not_send_transport_reminder_if_already_booked`
- `test_does_not_resend_transport_reminder_already_sent`
- `test_does_not_send_transport_reminder_for_flights_or_drives`
- `test_does_not_send_transport_reminder_when_departure_is_today_or_past`

---

## Files Changed Summary

| File | Change |
|---|---|
| `app/core/email_config.py` | New — centralised Brevo config |
| `app/services/email_service.py` | Extend — 3 new send functions, import from email_config |
| `app/services/reminder_service.py` | New — daily reminder query logic |
| `app/models/accommodation.py` | Add `cancel_reminder_sent` Boolean |
| `app/models/trip_transport.py` | Add `booking_reminder_sent` Boolean |
| `app/routers/trips.py` | Call `send_trip_share_email` on share creation |
| `app/main.py` | Wire APScheduler on startup/shutdown |
| `migrations/` | New migration adding both columns |
| `requirements.txt` | Add `apscheduler` |
| `docs/deployment.md` | Document 3 new env vars |
| `tests/test_email_service.py` | Extend with 3 new function tests |
| `tests/test_reminder_service.py` | New — daily job logic tests |

---

## Deferred

- HTML styling for email templates (plain text is sufficient for now)
- Configurable reminder lead times (3 days / 90 days are hardcoded defaults)
- Cron job to purge expired `password_reset_tokens`
- Email preferences / unsubscribe per user
