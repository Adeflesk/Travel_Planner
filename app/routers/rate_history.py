"""
app/routers/rate_history.py - Rate history and monitoring endpoints
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.core.deps import get_current_user
from app import models
from app.core.trip_access import TripAccess
from app.schemas.rate_snapshot import (
    CurrencyRateSummary,
    GlobalRateSummary,
    RatePoint,
    TripRateSummary,
)
from app.services.exchange_rate import get_rates
from app.services.rate_snapshot_service import (
    get_currencies_across_user_trips,
    get_currencies_used_in_trip,
    get_rate_history,
)

router = APIRouter(prefix="/rate-history", tags=["rate-history"])


def _build_currency_summary(
    db: Session,
    base_currency: str,
    target_currency: str,
    from_date: datetime,
    to_date: datetime,
) -> CurrencyRateSummary:
    """Build a CurrencyRateSummary with current rate + historical data."""
    rates = get_rates(base_currency)
    current_rate = rates.get(target_currency) if rates else None

    snapshots = get_rate_history(db, base_currency, target_currency, from_date, to_date)
    history = [
        RatePoint(rate=float(s.rate), fetched_at=s.fetched_at) for s in snapshots
    ]

    return CurrencyRateSummary(
        base_currency=base_currency,
        target_currency=target_currency,
        current_rate=current_rate,
        history=history,
    )


@router.get("/trip/{trip_id}", response_model=TripRateSummary)
def get_trip_rate_summary(
    trip: models.Trip = Depends(TripAccess("view")),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """
    Return exchange rate summary for all currencies used in a trip.

    Includes current live rate and historical snapshots for the last N days.
    """
    base = (trip.default_currency or "USD").upper()
    target_currencies = get_currencies_used_in_trip(db, trip.id)

    now = datetime.now(timezone.utc)
    from_date = now - timedelta(days=days)

    currencies = [
        _build_currency_summary(db, base, tc, from_date, now)
        for tc in target_currencies
    ]

    return TripRateSummary(trip_base_currency=base, currencies=currencies)


@router.get("/global", response_model=GlobalRateSummary)
def get_global_rate_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return exchange rate summary for all currencies across user's trips.

    Uses the user's preferred currency from settings as the base.
    """
    user_base, target_currencies = get_currencies_across_user_trips(db, current_user.id)

    now = datetime.now(timezone.utc)
    from_date = now - timedelta(days=days)

    currencies = [
        _build_currency_summary(db, user_base, tc, from_date, now)
        for tc in target_currencies
    ]

    return GlobalRateSummary(user_base_currency=user_base, currencies=currencies)
