"""
app/schemas/stop_option.py - StopOption Pydantic schemas

Defines StopOption-related Pydantic models: `StopOptionBase`, `StopOptionCreate`,
`StopOptionUpdate`, and `StopOption`.

Author: Travel Planner Team
"""

from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

# Valid option types
OptionType = Literal[
    "activity", "meal", "sightseeing", "rest", "fuel", "shopping", "other"
]

# Valid status values
OptionStatus = Literal["considering", "selected", "skipped", "done"]


class StopOptionBase(BaseModel):
    name: str
    description: Optional[str] = None
    option_type: OptionType = "other"
    estimated_duration: Optional[int] = None  # Duration in minutes
    estimated_cost: Optional[Decimal] = None
    currency: str = "USD"
    url: Optional[str] = None
    notes: Optional[str] = None
    status: OptionStatus = "considering"
    order: int = 0

    @field_validator("estimated_duration")
    @classmethod
    def validate_duration(cls, v):
        if v is not None and v < 0:
            raise ValueError("Estimated duration cannot be negative")
        return v

    @field_validator("estimated_cost")
    @classmethod
    def validate_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError("Estimated cost cannot be negative")
        return v


class StopOptionCreate(StopOptionBase):
    stop_id: int


class StopOptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    option_type: Optional[OptionType] = None
    estimated_duration: Optional[int] = None
    estimated_cost: Optional[Decimal] = None
    currency: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[OptionStatus] = None
    order: Optional[int] = None

    @field_validator("estimated_duration")
    @classmethod
    def validate_duration(cls, v):
        if v is not None and v < 0:
            raise ValueError("Estimated duration cannot be negative")
        return v

    @field_validator("estimated_cost")
    @classmethod
    def validate_cost(cls, v):
        if v is not None and v < 0:
            raise ValueError("Estimated cost cannot be negative")
        return v


class StopOption(StopOptionBase):
    id: int
    stop_id: int

    model_config = ConfigDict(from_attributes=True)


class StopOptionStatusUpdate(BaseModel):
    """Schema for updating just the status of an option."""

    status: OptionStatus
