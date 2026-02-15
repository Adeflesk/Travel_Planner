"""
app/schemas/journey.py - Journey Pydantic schemas

Defines Journey-related Pydantic models: `JourneyBase`, `JourneyCreate`,
`JourneyUpdate`, and `Journey`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal, Optional


# Route type options
RouteType = Literal["fastest", "shortest", "scenic", "avoid_highways", "avoid_tolls"]


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
    # Route details
    distance_km: Optional[Decimal] = None
    distance_miles: Optional[Decimal] = None
    estimated_duration_minutes: Optional[int] = None
    route_type: Optional[RouteType] = None
    has_tolls: bool = False
    toll_cost: Optional[Decimal] = None
    route_notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_departure_before_arrival(self):
        if self.departure_datetime and self.arrival_datetime:

            def to_utc_naive(value: datetime) -> datetime:
                if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
                    return value.replace(tzinfo=None)
                return value.astimezone(timezone.utc).replace(tzinfo=None)

            departure = to_utc_naive(self.departure_datetime)
            arrival = to_utc_naive(self.arrival_datetime)

            if departure >= arrival:
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
    # Route details
    distance_km: Optional[Decimal] = None
    distance_miles: Optional[Decimal] = None
    estimated_duration_minutes: Optional[int] = None
    route_type: Optional[RouteType] = None
    has_tolls: Optional[bool] = None
    toll_cost: Optional[Decimal] = None
    route_notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_departure_before_arrival(self):
        if self.departure_datetime and self.arrival_datetime:

            def to_utc_naive(value: datetime) -> datetime:
                if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
                    return value.replace(tzinfo=None)
                return value.astimezone(timezone.utc).replace(tzinfo=None)

            departure = to_utc_naive(self.departure_datetime)
            arrival = to_utc_naive(self.arrival_datetime)

            if departure >= arrival:
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
