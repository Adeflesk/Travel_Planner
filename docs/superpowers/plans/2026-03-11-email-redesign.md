# Email System Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken password reset email, centralise all Brevo config, and add trip share notification + accommodation cancellation reminder + transport booking window reminder emails via a daily APScheduler job.

**Architecture:** Six independent chunks in sequence. Each chunk produces committed, passing code before the next begins. TDD throughout — tests written before implementation.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy, `brevo` SDK (module `brevo`, raises `brevo.core.api_error.ApiError`), `apscheduler`, pytest, `unittest.mock`

---

## Codebase Context

Before starting, read these files to understand existing patterns:

- `app/services/email_service.py` — existing `send_password_reset_email` using `brevo.Brevo` client
- `tests/test_email_service.py` — existing test pattern: `patch("brevo.Brevo")` + `importlib.reload(email_service)`
- `app/main.py` — `create_app()` factory; app is created at module level as `app = create_app()`
- `app/core/migrations.py` — `run_migrations()` calls `add_column_if_not_exists()` directly

**SDK note:** The installed SDK is the v4 `brevo` package. It raises `ApiError` from `brevo.core.api_error` — NOT `ApiException`. All tests mock `brevo.Brevo`.

---

## Chunk 1: Email Config Module

### Task 1: Create `app/core/email_config.py`

**Files:**
- Create: `app/core/email_config.py`

- [ ] **Step 1: Write the file**

```python
# app/core/email_config.py
"""
Centralised Brevo configuration.

All email service functions import from here.
If BREVO_API_KEY is not set, send functions log a warning and skip silently.
"""
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

- [ ] **Step 2: Verify the module imports cleanly**

```bash
source .venv/bin/activate
python -c "from app.core.email_config import BREVO_API_KEY, TEMPLATE_PASSWORD_RESET; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/core/email_config.py
git commit -m "feat: add centralised Brevo email config module"
```

---

### Task 2: Refactor `email_service.py` to use `email_config`

**Files:**
- Modify: `app/services/email_service.py`

The current file reads env vars inline with `os.getenv`. Replace with imports from `email_config`. The function behaviour is identical — this is a refactor only.

- [ ] **Step 1: Run existing tests to confirm they pass before touching anything**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 2: Replace `email_service.py` contents**

```python
"""
app/services/email_service.py - Transactional email via Brevo SDK (v4).

Config is centralised in app.core.email_config.
If BREVO_API_KEY is not set, send functions log a warning and return without sending.
"""
import logging

from brevo import Brevo
from brevo.core.api_error import ApiError
from brevo.transactional_emails.types import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from app.core import email_config

logger = logging.getLogger(__name__)


def _make_client() -> Brevo:
    return Brevo(api_key=email_config.BREVO_API_KEY)


def _sender() -> SendTransacEmailRequestSender:
    return SendTransacEmailRequestSender(
        name=email_config.BREVO_SENDER_NAME,
        email=email_config.BREVO_SENDER_EMAIL,
    )


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Send a password reset email via Brevo transactional template.

    Silently skips if BREVO_API_KEY is not configured.
    Raises ApiError on Brevo API errors (caller handles suppression).
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping password reset email to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_PASSWORD_RESET,
            params={"RESET_LINK": reset_link, "EXPIRY": "1 hour"},
            sender=_sender(),
        )
        logger.info("Password reset email sent to %s", to_email)
    except ApiError as e:
        logger.error("Brevo API error sending to %s: %s", to_email, e)
        raise
```

- [ ] **Step 3: Run existing tests to confirm they still pass**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py -v
```

Expected: 3 tests PASS. The mock patches `brevo.Brevo` which still works because `_make_client()` calls `Brevo(...)`.

- [ ] **Step 4: Commit**

```bash
git add app/services/email_service.py
git commit -m "refactor: centralise email config imports in email_service"
```

---

## Chunk 2: New Email Service Functions

### Task 3: `send_trip_share_email`

**Files:**
- Modify: `tests/test_email_service.py`
- Modify: `app/services/email_service.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_email_service.py`:

```python


class TestSendTripShareEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        """Trip share email is skipped gracefully when BREVO_API_KEY is not configured."""
        env_backup = os.environ.copy()
        os.environ.pop("BREVO_API_KEY", None)
        try:
            from app.services import email_service
            importlib.reload(email_service)
            from app.services.email_service import send_trip_share_email

            send_trip_share_email(
                "recipient@example.com",
                trip_name="Portugal 2026",
                shared_by="owner@example.com",
                trip_url="http://localhost:3000/trips/1",
            )
        finally:
            os.environ.clear()
            os.environ.update(env_backup)

        assert any("BREVO_API_KEY" in r.message for r in caplog.records)

    def test_calls_brevo_with_correct_params(self):
        """send_trip_share_email calls Brevo with TRIP_NAME, SHARED_BY, TRIP_URL."""
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_TRIP_SHARE": "10",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                MockBrevo.return_value = mock_client

                from app.services import email_service
                importlib.reload(email_service)
                from app.services.email_service import send_trip_share_email

                send_trip_share_email(
                    "recipient@example.com",
                    trip_name="Portugal 2026",
                    shared_by="owner@example.com",
                    trip_url="http://localhost:3000/trips/1",
                )

                mock_client.transactional_emails.send_transac_email.assert_called_once()
                kwargs = mock_client.transactional_emails.send_transac_email.call_args.kwargs
                assert kwargs["template_id"] == 10
                assert kwargs["params"]["TRIP_NAME"] == "Portugal 2026"
                assert kwargs["params"]["SHARED_BY"] == "owner@example.com"
                assert kwargs["params"]["TRIP_URL"] == "http://localhost:3000/trips/1"
                assert kwargs["to"][0].email == "recipient@example.com"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py::TestSendTripShareEmail -v
```

Expected: FAIL — `ImportError: cannot import name 'send_trip_share_email'`

- [ ] **Step 3: Add `send_trip_share_email` to `email_service.py`**

Append after `send_password_reset_email`:

```python


def send_trip_share_email(
    to_email: str,
    trip_name: str,
    shared_by: str,
    trip_url: str,
) -> None:
    """
    Notify a user that a trip has been shared with them.

    Silently skips if BREVO_API_KEY is not configured.
    Raises ApiError on Brevo API errors (caller swallows).
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping trip share email to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_TRIP_SHARE,
            params={
                "TRIP_NAME": trip_name,
                "SHARED_BY": shared_by,
                "TRIP_URL": trip_url,
            },
            sender=_sender(),
        )
        logger.info("Trip share email sent to %s for trip '%s'", to_email, trip_name)
    except ApiError as e:
        logger.error("Brevo API error sending trip share to %s: %s", to_email, e)
        raise
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py::TestSendTripShareEmail -v
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/test_email_service.py app/services/email_service.py
git commit -m "feat: add send_trip_share_email with tests"
```

---

### Task 4: `send_accommodation_reminder_email` and `send_transport_booking_reminder_email`

**Files:**
- Modify: `tests/test_email_service.py`
- Modify: `app/services/email_service.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_email_service.py`:

```python


class TestSendAccommodationReminderEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        env_backup = os.environ.copy()
        os.environ.pop("BREVO_API_KEY", None)
        try:
            from app.services import email_service
            importlib.reload(email_service)
            from app.services.email_service import send_accommodation_reminder_email

            send_accommodation_reminder_email(
                "user@example.com",
                accommodation_name="Hotel Lisboa",
                cancel_by_date="2026-04-01",
                trip_name="Portugal 2026",
            )
        finally:
            os.environ.clear()
            os.environ.update(env_backup)

        assert any("BREVO_API_KEY" in r.message for r in caplog.records)

    def test_calls_brevo_with_correct_params(self):
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_ACCOMMODATION_REMINDER": "20",
            "FRONTEND_URL": "http://localhost:3000",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                MockBrevo.return_value = mock_client

                from app.services import email_service
                importlib.reload(email_service)
                from app.services.email_service import send_accommodation_reminder_email

                send_accommodation_reminder_email(
                    "user@example.com",
                    accommodation_name="Hotel Lisboa",
                    cancel_by_date="2026-04-01",
                    trip_name="Portugal 2026",
                )

                kwargs = mock_client.transactional_emails.send_transac_email.call_args.kwargs
                assert kwargs["template_id"] == 20
                assert kwargs["params"]["ACCOMMODATION_NAME"] == "Hotel Lisboa"
                assert kwargs["params"]["CANCEL_BY_DATE"] == "2026-04-01"
                assert kwargs["params"]["TRIP_NAME"] == "Portugal 2026"
                assert kwargs["params"]["APP_URL"] == "http://localhost:3000"
                assert kwargs["to"][0].email == "user@example.com"


class TestSendTransportBookingReminderEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        env_backup = os.environ.copy()
        os.environ.pop("BREVO_API_KEY", None)
        try:
            from app.services import email_service
            importlib.reload(email_service)
            from app.services.email_service import send_transport_booking_reminder_email

            send_transport_booking_reminder_email(
                "user@example.com",
                transport_type="train",
                origin="London",
                destination="Paris",
                departure_date="2026-06-01",
                trip_name="Portugal 2026",
            )
        finally:
            os.environ.clear()
            os.environ.update(env_backup)

        assert any("BREVO_API_KEY" in r.message for r in caplog.records)

    def test_calls_brevo_with_correct_params(self):
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER": "30",
            "FRONTEND_URL": "http://localhost:3000",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                MockBrevo.return_value = mock_client

                from app.services import email_service
                importlib.reload(email_service)
                from app.services.email_service import send_transport_booking_reminder_email

                send_transport_booking_reminder_email(
                    "user@example.com",
                    transport_type="train",
                    origin="London",
                    destination="Paris",
                    departure_date="2026-06-01",
                    trip_name="Portugal 2026",
                )

                kwargs = mock_client.transactional_emails.send_transac_email.call_args.kwargs
                assert kwargs["template_id"] == 30
                assert kwargs["params"]["TRANSPORT_TYPE"] == "train"
                assert kwargs["params"]["ORIGIN"] == "London"
                assert kwargs["params"]["DESTINATION"] == "Paris"
                assert kwargs["params"]["DEPARTURE_DATE"] == "2026-06-01"
                assert kwargs["params"]["TRIP_NAME"] == "Portugal 2026"
                assert kwargs["params"]["APP_URL"] == "http://localhost:3000"
                assert kwargs["to"][0].email == "user@example.com"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py::TestSendAccommodationReminderEmail tests/test_email_service.py::TestSendTransportBookingReminderEmail -v
```

Expected: FAIL — ImportError for both missing functions.

- [ ] **Step 3: Add both functions to `email_service.py`**

Append after `send_trip_share_email`:

```python


def send_accommodation_reminder_email(
    to_email: str,
    accommodation_name: str,
    cancel_by_date: str,
    trip_name: str,
) -> None:
    """
    Remind a user their free cancellation window is closing.

    APP_URL is sourced from email_config.FRONTEND_URL internally.
    Silently skips if BREVO_API_KEY is not configured.
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping accommodation reminder to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_ACCOMMODATION_REMINDER,
            params={
                "ACCOMMODATION_NAME": accommodation_name,
                "CANCEL_BY_DATE": cancel_by_date,
                "TRIP_NAME": trip_name,
                "APP_URL": email_config.FRONTEND_URL,
            },
            sender=_sender(),
        )
        logger.info("Accommodation reminder sent to %s for '%s'", to_email, accommodation_name)
    except ApiError as e:
        logger.error("Brevo API error sending accommodation reminder to %s: %s", to_email, e)
        raise


def send_transport_booking_reminder_email(
    to_email: str,
    transport_type: str,
    origin: str,
    destination: str,
    departure_date: str,
    trip_name: str,
) -> None:
    """
    Notify a user that booking is now open for an unbooked transport leg.

    APP_URL is sourced from email_config.FRONTEND_URL internally.
    Silently skips if BREVO_API_KEY is not configured.
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping transport booking reminder to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_TRANSPORT_BOOKING_REMINDER,
            params={
                "TRANSPORT_TYPE": transport_type,
                "ORIGIN": origin,
                "DESTINATION": destination,
                "DEPARTURE_DATE": departure_date,
                "TRIP_NAME": trip_name,
                "APP_URL": email_config.FRONTEND_URL,
            },
            sender=_sender(),
        )
        logger.info(
            "Transport booking reminder sent to %s for %s → %s",
            to_email, origin, destination,
        )
    except ApiError as e:
        logger.error("Brevo API error sending transport reminder to %s: %s", to_email, e)
        raise
```

- [ ] **Step 4: Run all email service tests**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py -v
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/test_email_service.py app/services/email_service.py
git commit -m "feat: add accommodation and transport booking reminder email functions"
```

---

## Chunk 3: Data Model Changes + Migration

### Task 5: Add `cancel_reminder_sent` to `Accommodation` model

**Files:**
- Modify: `app/models/accommodation.py`

- [ ] **Step 1: Add the column after `booked`**

In `app/models/accommodation.py`, find:
```python
    booked = Column(Boolean, nullable=False, default=False)
```

Add after it:
```python
    cancel_reminder_sent = Column(Boolean, nullable=False, default=False)
```

- [ ] **Step 2: Verify the model imports cleanly**

```bash
source .venv/bin/activate
python -c "from app.models.accommodation import Accommodation; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/models/accommodation.py
git commit -m "feat: add cancel_reminder_sent column to Accommodation model"
```

---

### Task 6: Add `booking_reminder_sent` to `TripTransport` model

**Files:**
- Modify: `app/models/trip_transport.py`

- [ ] **Step 1: Add the column after `booked`**

In `app/models/trip_transport.py`, find:
```python
    booked = Column(Boolean, nullable=False, default=False)
```

Add after it:
```python
    booking_reminder_sent = Column(Boolean, nullable=False, default=False)
```

- [ ] **Step 2: Verify the model imports cleanly**

```bash
source .venv/bin/activate
python -c "from app.models.trip_transport import TripTransport; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/models/trip_transport.py
git commit -m "feat: add booking_reminder_sent column to TripTransport model"
```

---

### Task 7: Add migration for both columns

**Files:**
- Modify: `app/core/migrations.py`

The `run_migrations()` function already handles adding columns idempotently via `add_column_if_not_exists`. Follow the exact same pattern used for `trip_transport_columns`.

- [ ] **Step 1: Add the new column groups to `run_migrations()`**

Find the `expense_columns` list at the bottom of `run_migrations()` (around line 284), and add after the block that processes it:

```python
    # Email reminder columns
    accommodation_reminder_columns = [
        ("cancel_reminder_sent", "BOOLEAN", "FALSE"),
    ]
    trip_transport_reminder_columns = [
        ("booking_reminder_sent", "BOOLEAN", "FALSE"),
    ]

    for col_name, col_type, default in accommodation_reminder_columns:
        if add_column_if_not_exists(engine, "accommodations", col_name, col_type, default):
            applied_migrations.append(f"accommodations.{col_name}")

    for col_name, col_type, default in trip_transport_reminder_columns:
        if add_column_if_not_exists(engine, "trip_transports", col_name, col_type, default):
            applied_migrations.append(f"trip_transports.{col_name}")
```

- [ ] **Step 2: Verify migration runs without error against the local DB**

```bash
source .venv/bin/activate
python -c "
from database import engine
from app.core.migrations import run_migrations
run_migrations(engine)
print('OK')
"
```

Expected: `OK` (logs will show column was added or already exists).

- [ ] **Step 3: Run full test suite to confirm nothing broke**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/core/migrations.py
git commit -m "feat: add migration for cancel_reminder_sent and booking_reminder_sent columns"
```

---

## Chunk 4: Reminder Service

### Task 8: Write failing tests for `reminder_service.py`

**Files:**
- Create: `tests/test_reminder_service.py`

The reminder service queries the live DB. Tests use an in-memory SQLite DB with the same `Base.metadata` pattern from `tests/test_auth.py`.

- [ ] **Step 1: Create the test file**

```python
# tests/test_reminder_service.py
"""Tests for the daily reminder service."""
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.models.user import User
from app.models.trip import Trip
from app.models.trip_day import TripDay
from app.models.accommodation import Accommodation
from app.models.trip_transport import TripTransport
from app.models.destination import Destination


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def make_user(db, email="owner@example.com"):
    user = User(email=email, hashed_password="hashed")
    db.add(user)
    db.flush()
    return user


def make_trip(db, user):
    trip = Trip(
        name="Portugal 2026",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 15),
        user_id=user.id,
    )
    db.add(trip)
    db.flush()
    return trip


def make_destination(db, trip):
    dest = Destination(trip_id=trip.id, name="Lisbon", country="Portugal")
    db.add(dest)
    db.flush()
    return dest


def make_accommodation(db, trip, dest, cancel_by_date, cancel_reminder_sent=False):
    acc = Accommodation(
        trip_id=trip.id,
        destination_id=dest.id,
        name="Hotel Lisboa",
        check_in_date=date(2026, 6, 1),
        check_out_date=date(2026, 6, 7),
        cancel_by_date=cancel_by_date,
        cancel_reminder_sent=cancel_reminder_sent,
    )
    db.add(acc)
    db.flush()
    return acc


def make_trip_day(db, trip, day_date):
    trip_day = TripDay(trip_id=trip.id, date=day_date, sort_order=0)
    db.add(trip_day)
    db.flush()
    return trip_day


def make_transport(db, trip, trip_day, transport_type="train", booked=False,
                   booking_reminder_sent=False):
    t = TripTransport(
        trip_id=trip.id,
        transport_type=transport_type,
        origin="London",
        destination="Paris",
        departure_day_id=trip_day.id,
        booked=booked,
        booking_reminder_sent=booking_reminder_sent,
        sort_order=0,
        overnight=False,
    )
    db.add(t)
    db.flush()
    return t


@patch("app.services.reminder_service.send_accommodation_reminder_email")
class TestAccommodationReminders:
    def test_sends_reminder_when_cancel_by_date_within_3_days(self, mock_send, db):
        """Sends reminder when cancel_by_date is today + 2 days."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        make_accommodation(db, trip, dest, cancel_by_date=date.today() + timedelta(days=2))
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_called_once()
        args = mock_send.call_args[1]
        assert args["to_email"] == "owner@example.com"
        assert args["accommodation_name"] == "Hotel Lisboa"
        assert args["trip_name"] == "Portugal 2026"

    def test_marks_cancel_reminder_sent_after_sending(self, mock_send, db):
        """Sets cancel_reminder_sent=True after sending."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        acc = make_accommodation(db, trip, dest, cancel_by_date=date.today() + timedelta(days=1))
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        db.refresh(acc)
        assert acc.cancel_reminder_sent is True

    def test_does_not_resend_reminder_already_sent(self, mock_send, db):
        """Skips accommodations where cancel_reminder_sent is True."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        make_accommodation(
            db, trip, dest,
            cancel_by_date=date.today() + timedelta(days=1),
            cancel_reminder_sent=True,
        )
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_outside_window(self, mock_send, db):
        """Skips accommodations where cancel_by_date is more than 3 days away."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        make_accommodation(db, trip, dest, cancel_by_date=date.today() + timedelta(days=10))
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_when_cancel_by_date_is_past(self, mock_send, db):
        """Skips accommodations where cancel_by_date has already passed."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        make_accommodation(db, trip, dest, cancel_by_date=date.today() - timedelta(days=1))
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()


@patch("app.services.reminder_service.send_transport_booking_reminder_email")
class TestTransportReminders:
    def test_sends_reminder_when_departure_within_90_days_and_unbooked(self, mock_send, db):
        """Sends reminder for unbooked train departing in 30 days."""
        user = make_user(db)
        trip = make_trip(db, user)
        trip_day = make_trip_day(db, trip, date.today() + timedelta(days=30))
        make_transport(db, trip, trip_day, transport_type="train")
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_called_once()
        args = mock_send.call_args[1]
        assert args["to_email"] == "owner@example.com"
        assert args["transport_type"] == "train"
        assert args["origin"] == "London"
        assert args["destination"] == "Paris"
        assert args["trip_name"] == "Portugal 2026"

    def test_marks_booking_reminder_sent_after_sending(self, mock_send, db):
        """Sets booking_reminder_sent=True after sending."""
        user = make_user(db)
        trip = make_trip(db, user)
        trip_day = make_trip_day(db, trip, date.today() + timedelta(days=30))
        transport = make_transport(db, trip, trip_day)
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        db.refresh(transport)
        assert transport.booking_reminder_sent is True

    def test_does_not_send_reminder_if_already_booked(self, mock_send, db):
        """Skips transport legs where booked=True."""
        user = make_user(db)
        trip = make_trip(db, user)
        trip_day = make_trip_day(db, trip, date.today() + timedelta(days=30))
        make_transport(db, trip, trip_day, booked=True)
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_resend_reminder_already_sent(self, mock_send, db):
        """Skips transport legs where booking_reminder_sent=True."""
        user = make_user(db)
        trip = make_trip(db, user)
        trip_day = make_trip_day(db, trip, date.today() + timedelta(days=30))
        make_transport(db, trip, trip_day, booking_reminder_sent=True)
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_for_flights_or_drives(self, mock_send, db):
        """Skips flights and drives — only train/bus/ferry get booking reminders."""
        user = make_user(db)
        trip = make_trip(db, user)
        trip_day = make_trip_day(db, trip, date.today() + timedelta(days=30))
        make_transport(db, trip, trip_day, transport_type="flight")
        make_transport(db, trip, trip_day, transport_type="drive")
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_when_departure_is_today_or_past(self, mock_send, db):
        """Skips departures today or in the past — too late to book."""
        user = make_user(db)
        trip = make_trip(db, user)
        today_day = make_trip_day(db, trip, date.today())
        past_day = make_trip_day(db, trip, date.today() - timedelta(days=1))
        make_transport(db, trip, today_day, transport_type="train")
        make_transport(db, trip, past_day, transport_type="train")
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_for_transport_without_departure_day(self, mock_send, db):
        """Skips transport legs with no departure_day_id (inner join)."""
        user = make_user(db)
        trip = make_trip(db, user)
        # transport with no departure day
        t = TripTransport(
            trip_id=trip.id,
            transport_type="train",
            origin="London",
            destination="Paris",
            departure_day_id=None,
            booked=False,
            booking_reminder_sent=False,
            sort_order=0,
            overnight=False,
        )
        db.add(t)
        db.commit()

        from app.services.reminder_service import send_due_reminders
        send_due_reminders(db)

        mock_send.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they all fail**

```bash
source .venv/bin/activate
pytest tests/test_reminder_service.py -v
```

Expected: all FAIL — `ModuleNotFoundError: No module named 'app.services.reminder_service'`

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/test_reminder_service.py
git commit -m "test: add failing tests for reminder_service"
```

---

### Task 9: Implement `reminder_service.py`

**Files:**
- Create: `app/services/reminder_service.py`

- [ ] **Step 1: Create the file**

```python
# app/services/reminder_service.py
"""
Daily reminder service.

send_due_reminders(db) is called by the APScheduler job in app/main.py at 08:00 UTC.
It scans for:
  - Accommodations with cancel_by_date within 3 days (inclusive today, exclusive past)
  - Unbooked trains/buses/ferries with departure date within 90 days (exclusive today)

Sends one email per record, then marks it as sent so it never repeats.
"""
import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.accommodation import Accommodation
from app.models.trip import Trip
from app.models.trip_day import TripDay
from app.models.trip_transport import TripTransport
from app.models.user import User
from app.services.email_service import (
    send_accommodation_reminder_email,
    send_transport_booking_reminder_email,
)

logger = logging.getLogger(__name__)


def send_due_reminders(db: Session) -> None:
    """Run both reminder scans in one pass. Called daily at 08:00 UTC."""
    today = date.today()
    _send_accommodation_reminders(db, today)
    _send_transport_reminders(db, today)


def _send_accommodation_reminders(db: Session, today: date) -> None:
    window_end = today + timedelta(days=3)

    due = (
        db.query(Accommodation, User.email)
        .join(Trip, Accommodation.trip_id == Trip.id)
        .join(User, Trip.user_id == User.id)
        .filter(
            Accommodation.cancel_by_date >= today,
            Accommodation.cancel_by_date <= window_end,
            Accommodation.cancel_reminder_sent == False,  # noqa: E712
        )
        .all()
    )

    for acc, owner_email in due:
        try:
            send_accommodation_reminder_email(
                to_email=owner_email,
                accommodation_name=acc.name,
                cancel_by_date=acc.cancel_by_date.isoformat(),
                trip_name=acc.trip.name,
            )
            acc.cancel_reminder_sent = True
        except Exception as e:
            logger.error(
                "Failed to send accommodation reminder for id=%s: %s", acc.id, e
            )

    db.commit()


def _send_transport_reminders(db: Session, today: date) -> None:
    window_end = today + timedelta(days=90)

    due = (
        db.query(TripTransport, User.email)
        .join(TripDay, TripTransport.departure_day_id == TripDay.id)
        .join(Trip, TripTransport.trip_id == Trip.id)
        .join(User, Trip.user_id == User.id)
        .filter(
            TripTransport.transport_type.in_(["train", "bus", "ferry"]),
            TripTransport.booked == False,  # noqa: E712
            TripTransport.booking_reminder_sent == False,  # noqa: E712
            TripDay.date > today,
            TripDay.date <= window_end,
        )
        .all()
    )

    for transport, owner_email in due:
        try:
            send_transport_booking_reminder_email(
                to_email=owner_email,
                transport_type=transport.transport_type,
                origin=transport.origin,
                destination=transport.destination,
                departure_date=transport.departure_day.date.isoformat(),
                trip_name=transport.trip.name,
            )
            transport.booking_reminder_sent = True
        except Exception as e:
            logger.error(
                "Failed to send transport reminder for id=%s: %s", transport.id, e
            )

    db.commit()
```

- [ ] **Step 2: Run reminder service tests**

```bash
source .venv/bin/activate
pytest tests/test_reminder_service.py -v
```

Expected: all 12 tests PASS.

- [ ] **Step 3: Run full test suite**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add app/services/reminder_service.py
git commit -m "feat: implement reminder_service with accommodation and transport reminders"
```

---

## Chunk 5: Wiring

### Task 10: Wire `send_trip_share_email` into `create_trip_share`

**Files:**
- Modify: `app/routers/trips.py`

- [ ] **Step 1: Add the import**

In `app/routers/trips.py`, find the imports section. Add:

```python
from app.services.email_service import send_trip_share_email
from app.core import email_config
```

- [ ] **Step 2: Capture the trip object and send the email**

In `create_trip_share`, the existing line:

```python
    get_trip_or_404(trip_id, db, current_user, require_owner=True)
```

Change to:

```python
    trip = get_trip_or_404(trip_id, db, current_user, require_owner=True)
```

Then, after `db.refresh(share)` and before the `return` statement, add:

```python
    # Send share notification email — swallow failures, share is already persisted
    try:
        send_trip_share_email(
            to_email=user.email,
            trip_name=trip.name,
            shared_by=current_user.email,
            trip_url=f"{email_config.FRONTEND_URL}/trips/{trip_id}",
        )
    except Exception as e:
        logger.error("Failed to send trip share email to %s: %s", user.email, e)
```

You'll also need a logger. Check if `logger = logging.getLogger(__name__)` is already in the file. If not, add it near the top after the imports.

- [ ] **Step 3: Check for existing logger**

```bash
grep -n "logger" app/routers/trips.py | head -5
```

If no logger exists, add after the imports:

```python
import logging
logger = logging.getLogger(__name__)
```

- [ ] **Step 4: Run the full test suite**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all tests PASS.

- [ ] **Step 5: Run lint**

```bash
source .venv/bin/activate
flake8 app/routers/trips.py --max-line-length=100
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/routers/trips.py
git commit -m "feat: send trip share notification email on share creation"
```

---

### Task 11: Wire APScheduler into `main.py`

**Files:**
- Modify: `requirements.txt`
- Modify: `app/main.py`

- [ ] **Step 1: Add `apscheduler` to `requirements.txt`**

Add to `requirements.txt`:

```
apscheduler>=3.10,<4.0
```

- [ ] **Step 2: Install it**

```bash
source .venv/bin/activate
pip install "apscheduler>=3.10,<4.0"
```

Expected: installs without error.

- [ ] **Step 3: Verify import**

```bash
python -c "from apscheduler.schedulers.background import BackgroundScheduler; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Add the scheduler to `main.py`**

In `app/main.py`, add these imports after the existing imports (after the `load_dotenv` block, keeping the `# noqa: E402` pattern):

```python
from contextlib import asynccontextmanager  # noqa: E402
from apscheduler.schedulers.background import BackgroundScheduler  # noqa: E402
```

Add the scheduler and lifespan definition before `create_app()`:

```python
_scheduler = BackgroundScheduler()


def _run_reminders_job() -> None:
    """APScheduler job: open a DB session, run reminders, close it."""
    from database import SessionLocal
    from app.services.reminder_service import send_due_reminders

    db = SessionLocal()
    try:
        send_due_reminders(db)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Reminder job failed: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _scheduler.add_job(_run_reminders_job, "cron", hour=8, minute=0, timezone="UTC")
    _scheduler.start()
    yield
    _scheduler.shutdown()
```

Then update `create_app()` to pass `lifespan=_lifespan`:

```python
def create_app() -> FastAPI:
    app = FastAPI(
        title="Travel Planner API",
        version="1.0.0",
        lifespan=_lifespan,
        docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
        redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    )
```

- [ ] **Step 5: Check `SessionLocal` exists in `database.py`**

```bash
grep -n "SessionLocal" database.py
```

If `SessionLocal` is not defined, use the existing `get_db` pattern instead. Check what's available:

```bash
grep -n "def get_db\|SessionLocal\|sessionmaker" database.py
```

If `SessionLocal` is not exported, define it inline in `_run_reminders_job`:

```python
from sqlalchemy.orm import sessionmaker
from database import engine
DBSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = DBSession()
```

- [ ] **Step 6: Start the server and verify it starts without error**

```bash
source .venv/bin/activate
uvicorn app.main:app --reload &
sleep 3
curl http://localhost:8000/health
kill %1
```

Expected: health endpoint returns 200.

- [ ] **Step 7: Run full test suite**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add requirements.txt app/main.py
git commit -m "feat: wire APScheduler daily reminder job into FastAPI lifespan"
```

---

## Chunk 6: Deployment Documentation + Brevo Templates

### Task 12: Update `docs/deployment.md`

**Files:**
- Modify: `docs/deployment.md`

- [ ] **Step 1: Find the Brevo section in deployment.md**

```bash
grep -n "BREVO\|SMTP" docs/deployment.md
```

- [ ] **Step 2: Add the three new env vars**

Find the existing Brevo env vars table. Add rows for the three new template IDs:

```markdown
| `BREVO_TEMPLATE_TRIP_SHARE` | No* | Integer template ID for trip share notification email |
| `BREVO_TEMPLATE_ACCOMMODATION_REMINDER` | No* | Integer template ID for accommodation cancellation reminder |
| `BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER` | No* | Integer template ID for transport booking window reminder |
```

- [ ] **Step 3: Set secrets on Fly.io**

After creating the three Brevo templates (see the design doc at `docs/superpowers/specs/2026-03-11-email-redesign-design.md` for the template bodies), set their IDs:

```bash
fly secrets set BREVO_TEMPLATE_TRIP_SHARE=<id>
fly secrets set BREVO_TEMPLATE_ACCOMMODATION_REMINDER=<id>
fly secrets set BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER=<id>
```

- [ ] **Step 4: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add new Brevo template env vars to deployment guide"
```

---

## Final Verification

- [ ] **Run the full test suite one last time**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all tests PASS.

- [ ] **Run lint**

```bash
source .venv/bin/activate
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
```

Expected: exit 0, no new errors.

---

## Brevo Template Setup Reminder

Before deploying, create these 3 new templates in the Brevo dashboard (see `docs/superpowers/specs/2026-03-11-email-redesign-design.md` Section 2 for the exact subject lines and bodies). Also update the **existing** password reset template body to include `{{ params.RESET_LINK }}` — that's the root cause of the original bug.

Template variables summary:

| Template | Subject | Params |
|---|---|---|
| Password Reset | `Reset your Travel Planner password` | `RESET_LINK`, `EXPIRY` |
| Trip Share | `{{ params.SHARED_BY }} shared a trip with you` | `TRIP_NAME`, `SHARED_BY`, `TRIP_URL` |
| Accommodation Reminder | `Reminder: cancel {{ params.ACCOMMODATION_NAME }} by {{ params.CANCEL_BY_DATE }}` | `ACCOMMODATION_NAME`, `CANCEL_BY_DATE`, `TRIP_NAME`, `APP_URL` |
| Transport Booking | `Booking now open: {{ params.ORIGIN }} → {{ params.DESTINATION }}` | `TRANSPORT_TYPE`, `ORIGIN`, `DESTINATION`, `DEPARTURE_DATE`, `TRIP_NAME`, `APP_URL` |
