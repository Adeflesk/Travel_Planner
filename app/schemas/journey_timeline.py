"""
app/schemas/journey_timeline.py - Journey timeline schemas

Defines schemas for journey-level timelines (stops and stop activities).

Author: Travel Planner Team
"""

from datetime import datetime
from typing import List, Literal, Optional, Union

from pydantic import BaseModel

from .stop_option import OptionStatus, OptionType


class JourneyTimelineStop(BaseModel):
    type: Literal["stop"] = "stop"
    id: int
    journey_id: int
    name: str
    location: Optional[str] = None
    planned_arrival: Optional[datetime] = None
    planned_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    notes: Optional[str] = None
    order: int = 0


class JourneyTimelineActivity(BaseModel):
    type: Literal["activity"] = "activity"
    id: int
    stop_id: int
    name: str
    description: Optional[str] = None
    option_type: OptionType = "other"
    estimated_duration: Optional[int] = None
    estimated_cost: Optional[float] = None
    currency: str = "USD"
    url: Optional[str] = None
    notes: Optional[str] = None
    status: OptionStatus = "considering"
    order: int = 0


JourneyTimelineItem = Union[JourneyTimelineStop, JourneyTimelineActivity]


class JourneyTimelineResponse(BaseModel):
    journey_id: int
    items: List[JourneyTimelineItem]
