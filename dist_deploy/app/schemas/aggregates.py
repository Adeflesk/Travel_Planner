"""
app/schemas/aggregates.py - Aggregate and summary schemas

Defines higher-level aggregate schemas used by endpoints: trip progress,
timeline items, destination-with-activities, and destination accommodation.

Author: Travel Planner Team
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from .destination import Destination
from .activity import Activity
from .journey import Journey
from .expense import Expense


class TripProgress(BaseModel):
    """Activity progress summary for a trip"""

    total_activities: int
    completed_activities: int
    progress_percent: int


class DestinationWithActivities(BaseModel):
    """Destination with nested activities list"""

    destination: Destination
    activities: list[Activity]


class TimelineDestinationItem(BaseModel):
    """Destination item for timeline"""

    type: str = "destination"
    sort_date: Optional[datetime] = None
    data: Destination


class TimelineJourneyItem(BaseModel):
    """Journey item for timeline"""

    type: str = "journey"
    sort_date: Optional[datetime] = None
    data: Journey


class TimelineItem(BaseModel):
    """Generic timeline item (union of destination/journey)"""

    type: str
    sort_date: Optional[datetime] = None
    destination: Optional[Destination] = None
    journey: Optional[Journey] = None


class DestinationAccommodation(BaseModel):
    """Accommodation expenses for a destination"""

    destination: Destination
    expenses: list[Expense]
    total: float
