"""
app/schemas/segment_option.py - Segment Option schemas
"""

from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

OptionStatus = Literal["researching", "selected", "booked", "rejected"]


class SegmentOptionBase(BaseModel):
    name: str
    provider: Optional[str] = None
    frequency: Optional[str] = None
    estimated_duration: Optional[int] = None
    cost: Optional[Decimal] = None
    currency: str = "USD"
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    status: OptionStatus = "researching"
    order: int = 0


class SegmentOptionCreate(SegmentOptionBase):
    segment_id: int


class SegmentOptionUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    frequency: Optional[str] = None
    estimated_duration: Optional[int] = None
    cost: Optional[Decimal] = None
    currency: Optional[str] = None
    booking_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[OptionStatus] = None
    order: Optional[int] = None


class SegmentOption(SegmentOptionBase):
    id: int
    segment_id: int

    model_config = ConfigDict(from_attributes=True)
