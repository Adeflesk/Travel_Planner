"""
app/schemas/trip.py - Trip Pydantic schemas

Defines Trip-related Pydantic models: `TripBase`, `TripCreate`,
`TripUpdate`, and `Trip` (ORM mode enabled via ConfigDict).

Author: Travel Planner Team
"""

from datetime import date as DateType
from datetime import datetime
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
    budget_warning_threshold: Optional[int] = 75
    budget_danger_threshold: Optional[int] = 90
    status: TripStatus = "planning"

    @model_validator(mode="after")
    def validate_dates(self) -> "TripBase":
        """Ensure end_date is not before start_date."""
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self

    @model_validator(mode="after")
    def validate_thresholds(self) -> "TripBase":
        """Ensure thresholds are valid and warning < danger."""
        w = self.budget_warning_threshold
        d = self.budget_danger_threshold
        if w is not None and (w < 1 or w > 100):
            raise ValueError("budget_warning_threshold must be between 1 and 100")
        if d is not None and (d < 1 or d > 100):
            raise ValueError("budget_danger_threshold must be between 1 and 100")
        if w is not None and d is not None and w >= d:
            raise ValueError(
                "budget_warning_threshold must be less than budget_danger_threshold"
            )
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
    budget_warning_threshold: Optional[int] = None
    budget_danger_threshold: Optional[int] = None
    status: Optional[TripStatus] = None

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        """Ensure budget is non-negative if provided."""
        if v is not None and v < 0:
            raise ValueError("budget must be non-negative")
        return v

    @model_validator(mode="after")
    def validate_thresholds(self) -> "TripUpdate":
        """Ensure thresholds are valid and warning < danger when both set."""
        w = self.budget_warning_threshold
        d = self.budget_danger_threshold
        if w is not None and (w < 1 or w > 100):
            raise ValueError("budget_warning_threshold must be between 1 and 100")
        if d is not None and (d < 1 or d > 100):
            raise ValueError("budget_danger_threshold must be between 1 and 100")
        if w is not None and d is not None and w >= d:
            raise ValueError(
                "budget_warning_threshold must be less than budget_danger_threshold"
            )
        return self


class Trip(TripBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripWithOwnership(Trip):
    """Trip with ownership information."""

    is_owner: bool = True
    shared_by: Optional[str] = None


class TripStatsCounts(BaseModel):
    """Counts of trip items by category."""

    destinations: int = 0
    journeys: int = 0
    activities: int = 0
    expenses: int = 0
    packing_items: int = 0


class TripStats(BaseModel):
    """Trip statistics summary."""

    total_cost: Decimal = Decimal("0")
    journey_cost: Decimal = Decimal("0")
    expense_cost: Decimal = Decimal("0")
    days_until_departure: Optional[int] = None
    duration_days: int = 0
    completion_percentage: float = 0.0
    booked_journeys: int = 0
    total_journeys: int = 0
    packed_items: int = 0
    total_packing_items: int = 0
    counts: TripStatsCounts = TripStatsCounts()
