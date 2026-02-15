"""
app/schemas/journey_stop.py - JourneyStop Pydantic schemas

Defines JourneyStop-related Pydantic models: `JourneyStopBase`, `JourneyStopCreate`,
`JourneyStopUpdate`, and `JourneyStop`.

Author: Travel Planner Team
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, model_validator


class JourneyStopBase(BaseModel):
    name: str
    location: Optional[str] = None
    planned_arrival: Optional[datetime] = None
    planned_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    notes: Optional[str] = None
    order: int = 0

    @model_validator(mode="after")
    def validate_planned_times(self):
        if self.planned_arrival and self.planned_departure:
            if self.planned_arrival > self.planned_departure:
                raise ValueError("Planned arrival must be before planned departure")
        return self

    @model_validator(mode="after")
    def validate_actual_times(self):
        if self.actual_arrival and self.actual_departure:
            if self.actual_arrival > self.actual_departure:
                raise ValueError("Actual arrival must be before actual departure")
        return self


class JourneyStopCreate(JourneyStopBase):
    journey_id: int


class JourneyStopUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    planned_arrival: Optional[datetime] = None
    planned_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    notes: Optional[str] = None
    order: Optional[int] = None

    @model_validator(mode="after")
    def validate_planned_times(self):
        if self.planned_arrival and self.planned_departure:
            if self.planned_arrival > self.planned_departure:
                raise ValueError("Planned arrival must be before planned departure")
        return self

    @model_validator(mode="after")
    def validate_actual_times(self):
        if self.actual_arrival and self.actual_departure:
            if self.actual_arrival > self.actual_departure:
                raise ValueError("Actual arrival must be before actual departure")
        return self


class JourneyStop(JourneyStopBase):
    id: int
    journey_id: int

    model_config = ConfigDict(from_attributes=True)


class JourneyStopWithOptions(JourneyStop):
    """JourneyStop with nested options for detailed views."""

    options: List["StopOption"] = []

    model_config = ConfigDict(from_attributes=True)


# Forward reference for circular import
from .stop_option import StopOption  # noqa: E402

JourneyStopWithOptions.model_rebuild()
