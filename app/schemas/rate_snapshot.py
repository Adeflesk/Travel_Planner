"""
app/schemas/rate_snapshot.py - Pydantic schemas for exchange rate history responses.
"""

from datetime import datetime
from pydantic import BaseModel


class RatePoint(BaseModel):
    """Single data point for a rate time-series."""

    rate: float
    fetched_at: datetime


class CurrencyRateSummary(BaseModel):
    """Current + historical rate info for one currency pair."""

    base_currency: str
    target_currency: str
    current_rate: float | None
    history: list[RatePoint]


class TripRateSummary(BaseModel):
    """All currency pairs relevant to a trip."""

    trip_base_currency: str
    currencies: list[CurrencyRateSummary]


class GlobalRateSummary(BaseModel):
    """All currency pairs across all user trips."""

    user_base_currency: str
    currencies: list[CurrencyRateSummary]
