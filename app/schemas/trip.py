"""
app/schemas/trip.py - Trip Pydantic schemas

Defines Trip-related Pydantic models: `TripBase`, `TripCreate`,
`TripUpdate`, and `Trip` (ORM mode enabled via ConfigDict).

Author: Travel Planner Team
"""

from datetime import datetime, date as DateType
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


# Valid trip statuses
TripStatus = Literal["planning", "booked", "ongoing", "completed", "cancelled"]


class TripBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: DateType
    end_date: DateType
    budget: Optional[Decimal] = None
    status: TripStatus = "planning"

    @model_validator(mode="after")
    def validate_dates(self) -> "TripBase":
        """Ensure end_date is not before start_date."""
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Ensure budget is non-negative if provided."""
        if v is not None and v < 0:
            raise ValueError("budget must be non-negative")
        return v


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    budget: Optional[Decimal] = None
    status: Optional[TripStatus] = None

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Ensure budget is non-negative if provided."""
        if v is not None and v < 0:
            raise ValueError("budget must be non-negative")
        return v


class Trip(TripBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripWithOwnership(Trip):
    """Trip with ownership information."""

    is_owner: bool = True
    shared_by: Optional[str] = None
