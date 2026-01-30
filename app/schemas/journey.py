"""
app/schemas/journey.py - Journey Pydantic schemas

Defines Journey-related Pydantic models: `JourneyBase`, `JourneyCreate`,
`JourneyUpdate`, and `Journey`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Optional


class JourneyBase(BaseModel):
    transport_mode: str
    departure_datetime: Optional[datetime] = None
    arrival_datetime: Optional[datetime] = None
    carrier: Optional[str] = None
    booking_reference: Optional[str] = None
    cost: Optional[Decimal] = None
    currency: str = "USD"
    notes: Optional[str] = None
    status: str = "planned"
    order: int = 0


class JourneyCreate(JourneyBase):
    trip_id: int
    origin_id: Optional[int] = None
    destination_id: Optional[int] = None


class JourneyUpdate(BaseModel):
    transport_mode: Optional[str] = None
    departure_datetime: Optional[datetime] = None
    arrival_datetime: Optional[datetime] = None
    carrier: Optional[str] = None
    booking_reference: Optional[str] = None
    cost: Optional[Decimal] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    order: Optional[int] = None
    origin_id: Optional[int] = None
    destination_id: Optional[int] = None


class Journey(JourneyBase):
    id: int
    trip_id: int
    origin_id: Optional[int] = None
    destination_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
