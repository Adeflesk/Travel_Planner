# Brevo Email Template Reference

Where each template is called, what triggers it, and what params it receives.

---

## 1. Password Reset

| | |
|---|---|
| **Template file** | `docs/resources/brevo-template-password-reset.html` |
| **Env var** | `BREVO_TEMPLATE_PASSWORD_RESET` |
| **Function** | `send_password_reset_email()` in `app/services/email_service.py:32` |
| **Called from** | `app/routers/auth.py:287` |
| **Trigger** | User submits `POST /forgot-password` with their email |
| **Error handling** | Wrapped in `try/except Exception` — failure is logged, endpoint still returns 200 to prevent user enumeration |

**Call chain:**

```
POST /forgot-password
  → app/routers/auth.py:forgot_password()
    → creates PasswordResetToken, commits to DB
    → send_password_reset_email(to_email=user.email, reset_link=...)
```

**Template params:**

| Param | Value |
|---|---|
| `RESET_LINK` | `{FRONTEND_URL}/reset-password?token={raw_token}` |
| `EXPIRY` | `"1 hour"` (hardcoded) |

---

## 2. Trip Share Notification

| | |
|---|---|
| **Template file** | `docs/resources/brevo-template-trip-share.html` |
| **Env var** | `BREVO_TEMPLATE_TRIP_SHARE` |
| **Function** | `send_trip_share_email()` in `app/services/email_service.py:65` |
| **Called from** | `app/routers/trips.py:517` |
| **Trigger** | Trip owner shares a trip via `POST /trips/{trip_id}/shares` |
| **Error handling** | Wrapped in `try/except Exception` — failure is logged, share is already committed to DB before the email call |

**Call chain:**

```
POST /trips/{trip_id}/shares
  → app/routers/trips.py:create_trip_share()
    → validates owner, creates TripShare, commits to DB
    → send_trip_share_email(to_email=user.email, trip_name=..., shared_by=..., trip_url=...)
```

**Template params:**

| Param | Value |
|---|---|
| `TRIP_NAME` | `trip.name` |
| `SHARED_BY` | `current_user.email` (the trip owner) |
| `TRIP_URL` | `{FRONTEND_URL}/trips/{trip_id}` |

---

## 3. Accommodation Cancellation Reminder

| | |
|---|---|
| **Template file** | `docs/resources/brevo-template-accommodation-reminder.html` |
| **Env var** | `BREVO_TEMPLATE_ACCOMMODATION_REMINDER` |
| **Function** | `send_accommodation_reminder_email()` in `app/services/email_service.py:107` |
| **Called from** | `app/services/reminder_service.py:54` |
| **Trigger** | Daily APScheduler cron job at 08:00 UTC — scans for accommodations with `cancel_by_date` within the next 3 days |
| **Error handling** | Per-record `try/except Exception` — one failure doesn't block other reminders. Sets `cancel_reminder_sent = True` after success to prevent duplicates. |

**Call chain:**

```
APScheduler cron (08:00 UTC daily)
  → app/main.py:_run_reminders_job()
    → app/services/reminder_service.py:send_due_reminders(db)
      → _send_accommodation_reminders(db, today)
        → queries: cancel_by_date >= today AND <= today+3 AND cancel_reminder_sent == False
        → for each match: send_accommodation_reminder_email(...)
        → marks cancel_reminder_sent = True
        → db.commit()
```

**Template params:**

| Param | Value |
|---|---|
| `ACCOMMODATION_NAME` | `accommodation.name` |
| `CANCEL_BY_DATE` | `accommodation.cancel_by_date` (ISO format) |
| `TRIP_NAME` | `trip.name` |
| `APP_URL` | `FRONTEND_URL` from `email_config` |

**Query filters:**

- `cancel_by_date >= today` (not already past)
- `cancel_by_date <= today + 3 days` (within the 3-day window)
- `cancel_reminder_sent == False` (not already sent)
- Inner join to `Trip → User` to get the owner's email

---

## 4. Transport Booking Window Reminder

| | |
|---|---|
| **Template file** | `docs/resources/brevo-template-transport-booking-reminder.html` |
| **Env var** | `BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER` |
| **Function** | `send_transport_booking_reminder_email()` in `app/services/email_service.py:155` |
| **Called from** | `app/services/reminder_service.py:89` |
| **Trigger** | Daily APScheduler cron job at 08:00 UTC — scans for unbooked train/bus/ferry legs departing within 90 days |
| **Error handling** | Per-record `try/except Exception` — one failure doesn't block other reminders. Sets `booking_reminder_sent = True` after success to prevent duplicates. |

**Call chain:**

```
APScheduler cron (08:00 UTC daily)
  → app/main.py:_run_reminders_job()
    → app/services/reminder_service.py:send_due_reminders(db)
      → _send_transport_reminders(db, today)
        → queries: transport_type in (train, bus, ferry) AND booked == False
                   AND booking_reminder_sent == False AND departure > today AND <= today+90
        → for each match: send_transport_booking_reminder_email(...)
        → marks booking_reminder_sent = True
        → db.commit()
```

**Template params:**

| Param | Value |
|---|---|
| `TRANSPORT_TYPE` | `transport.transport_type` (train, bus, or ferry) |
| `ORIGIN` | `transport.origin` |
| `DESTINATION` | `transport.destination` |
| `DEPARTURE_DATE` | `trip_day.date` (ISO format, via `departure_day` relationship) |
| `TRIP_NAME` | `trip.name` |
| `APP_URL` | `FRONTEND_URL` from `email_config` |

**Query filters:**

- `transport_type IN ('train', 'bus', 'ferry')` — flights and drives excluded
- `booked == False` — already booked transports skipped
- `booking_reminder_sent == False` — not already sent
- `TripDay.date > today` — today's departures excluded (too late to book)
- `TripDay.date <= today + 90 days` — within booking window
- Inner join on `departure_day_id` — transports with no departure day silently skipped

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     app/main.py                             │
│  APScheduler (cron: daily 08:00 UTC)                        │
│    └─ _run_reminders_job()                                  │
│         └─ reminder_service.send_due_reminders(db)          │
│              ├─ send_accommodation_reminder_email()     ──┐ │
│              └─ send_transport_booking_reminder_email() ──┤ │
├───────────────────────────────────────────────────────────┤ │
│                     app/routers/                          │ │
│  auth.py:forgot_password()                                │ │
│    └─ send_password_reset_email()                      ──┤ │
│  trips.py:create_trip_share()                             │ │
│    └─ send_trip_share_email()                          ──┤ │
├───────────────────────────────────────────────────────────┤ │
│                app/services/email_service.py              │ │
│  All 4 send_* functions live here                     ◄──┘ │
│    └─ Reads config from app/core/email_config.py            │
│    └─ Calls Brevo SDK (brevo.Brevo)                         │
└─────────────────────────────────────────────────────────────┘
```

## Config

All template IDs and Brevo credentials are read from environment variables via `app/core/email_config.py`. If `BREVO_API_KEY` is not set, all send functions skip silently. If a specific template ID is `0` (not configured), that function also skips with a warning log.
