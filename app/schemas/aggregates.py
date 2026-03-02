"""
app/schemas/aggregates.py - Aggregate and summary schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from .destination import Destination
from .day_activity import DayActivityResponse
from .expense import Expense


class TripProgress(BaseModel):
    total_activities: int
    completed_activities: int
    progress_percent: int


class DestinationWithActivities(BaseModel):
    destination: Destination
    activities: list[DayActivityResponse]


class TimelineDestinationItem(BaseModel):
    type: str = "destination"
    sort_date: Optional[datetime] = None
    data: Destination


class DestinationAccommodation(BaseModel):
    destination: Destination
    expenses: list[Expense]
    total: float
