"""
app/schemas/journey_option.py - JourneyOption Pydantic schemas

Defines JourneyOption-related Pydantic models for tracking booking alternatives.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional


# Option status types
OptionStatus = Literal["researching", "selected", "booked", "rejected"]


class JourneyOptionBase(BaseModel):
    name: str
    carrier: Optional[str] = None
    transport_mode: Optional[str] = None
    frequency: Optional[str] = None
    estimated_duration: Optional[int] = None
    cost: Optional[Decimal] = None
    currency: str = "USD"
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    status: OptionStatus = "researching"
    order: int = 0


class JourneyOptionCreate(JourneyOptionBase):
    journey_id: int


class JourneyOptionUpdate(BaseModel):
    name: Optional[str] = None
    carrier: Optional[str] = None
    transport_mode: Optional[str] = None
    frequency: Optional[str] = None
    estimated_duration: Optional[int] = None
    cost: Optional[Decimal] = None
    currency: Optional[str] = None
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[OptionStatus] = None
    order: Optional[int] = None


class JourneyOption(JourneyOptionBase):
    id: int
    journey_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JourneyOptionReorder(BaseModel):
    """Schema for reordering journey options."""

    option_ids: list[int]
