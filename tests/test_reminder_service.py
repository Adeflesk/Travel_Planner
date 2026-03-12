# tests/test_reminder_service.py
"""Tests for the daily reminder service."""
from datetime import date, timedelta
from unittest.mock import patch

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


def make_transport(
    db,
    trip,
    trip_day,
    transport_type="train",
    booked=False,
    booking_reminder_sent=False,
):
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
        make_accommodation(
            db, trip, dest, cancel_by_date=date.today() + timedelta(days=2)
        )
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
        acc = make_accommodation(
            db, trip, dest, cancel_by_date=date.today() + timedelta(days=1)
        )
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
            db,
            trip,
            dest,
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
        make_accommodation(
            db, trip, dest, cancel_by_date=date.today() + timedelta(days=10)
        )
        db.commit()

        from app.services.reminder_service import send_due_reminders

        send_due_reminders(db)

        mock_send.assert_not_called()

    def test_does_not_send_reminder_when_cancel_by_date_is_past(self, mock_send, db):
        """Skips accommodations where cancel_by_date has already passed."""
        user = make_user(db)
        trip = make_trip(db, user)
        dest = make_destination(db, trip)
        make_accommodation(
            db, trip, dest, cancel_by_date=date.today() - timedelta(days=1)
        )
        db.commit()

        from app.services.reminder_service import send_due_reminders

        send_due_reminders(db)

        mock_send.assert_not_called()


@patch("app.services.reminder_service.send_transport_booking_reminder_email")
class TestTransportReminders:
    def test_sends_reminder_when_departure_within_90_days_and_unbooked(
        self, mock_send, db
    ):
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

    def test_does_not_send_reminder_when_departure_is_today_or_past(
        self, mock_send, db
    ):
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

    def test_does_not_send_reminder_for_transport_without_departure_day(
        self, mock_send, db
    ):
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
