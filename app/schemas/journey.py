"""
app/schemas/journey.py - Journey Pydantic schemas

Defines Journey-related Pydantic models: `JourneyBase`, `JourneyCreate`,
`JourneyUpdate`, and `Journey`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict, model_validator
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

    @model_validator(mode="after")
    def validate_departure_before_arrival(self):
        if self.departure_datetime and self.arrival_datetime:
            if self.departure_datetime >= self.arrival_datetime:
                raise ValueError("Departure datetime must be before arrival datetime")
        return self


class JourneyCreate(JourneyBase):
    trip_id: int
    origin_id: Optional[int] = None
    destination_id: Optional[int] = None
    # Text fields for locations not in destinations (e.g., home airport)
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None


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
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_departure_before_arrival(self):
        if self.departure_datetime and self.arrival_datetime:
            if self.departure_datetime >= self.arrival_datetime:
                raise ValueError("Departure datetime must be before arrival datetime")
        return self


class Journey(JourneyBase):
    id: int
    trip_id: int
    origin_id: Optional[int] = None
    destination_id: Optional[int] = None
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
