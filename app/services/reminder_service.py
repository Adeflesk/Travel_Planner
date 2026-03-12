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
