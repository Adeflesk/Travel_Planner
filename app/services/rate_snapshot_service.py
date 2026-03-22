"""
app/services/rate_snapshot_service.py - Record and query exchange rate snapshots

Provides functions to persist rate data points in the rate_snapshots table
and retrieve historical time-series for graphing.
"""

import logging
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.rate_snapshot import RateSnapshot

logger = logging.getLogger(__name__)


def record_snapshots(
    db: Session,
    base_currency: str,
    rates: dict[str, float],
    target_currencies: list[str],
) -> int:
    """
    Record rate snapshots for the given currency pairs.

    Only records rates for currencies in *target_currencies* that exist
    in the *rates* dict. Returns the number of rows inserted.
    """
    if not target_currencies or not rates:
        return 0

    count = 0
    for currency in target_currencies:
        rate_value = rates.get(currency)
        if rate_value is None:
            continue
        db.add(
            RateSnapshot(
                base_currency=base_currency.upper(),
                target_currency=currency.upper(),
                rate=Decimal(str(rate_value)),
            )
        )
        count += 1

    if count > 0:
        db.commit()
        logger.info("Recorded %d rate snapshots for base %s", count, base_currency)

    return count


def get_rate_history(
    db: Session,
    base_currency: str,
    target_currency: str,
    from_date: datetime,
    to_date: datetime,
) -> list[RateSnapshot]:
    """
    Return rate snapshots for a currency pair within a date range,
    sorted by fetched_at ascending.
    """
    return (
        db.query(RateSnapshot)
        .filter(
            RateSnapshot.base_currency == base_currency.upper(),
            RateSnapshot.target_currency == target_currency.upper(),
            RateSnapshot.fetched_at >= from_date,
            RateSnapshot.fetched_at <= to_date,
        )
        .order_by(RateSnapshot.fetched_at.asc())
        .all()
    )


def get_currencies_used_in_trip(db: Session, trip_id: int) -> list[str]:
    """
    Return distinct expense currencies used in a trip (excluding the trip's base currency).
    """
    from app.models.expense import Expense
    from app.models.trip import Trip

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        return []

    base = (trip.default_currency or "USD").upper()

    rows = (
        db.query(Expense.currency).filter(Expense.trip_id == trip_id).distinct().all()
    )

    return [r[0].upper() for r in rows if r[0] and r[0].upper() != base]


def get_currencies_across_user_trips(
    db: Session, user_id: int
) -> tuple[str, list[str]]:
    """
    Return (user_base_currency, [distinct foreign currencies]) across all
    trips owned by the user.
    """
    from app.models.expense import Expense
    from app.models.trip import Trip
    from app.models.user_settings import UserSettings

    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    user_base = (settings.default_currency if settings else "USD").upper()

    rows = (
        db.query(Expense.currency)
        .join(Trip, Expense.trip_id == Trip.id)
        .filter(Trip.user_id == user_id)
        .distinct()
        .all()
    )

    currencies = [r[0].upper() for r in rows if r[0] and r[0].upper() != user_base]
    return user_base, currencies
