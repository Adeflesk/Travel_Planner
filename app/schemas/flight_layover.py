"""
app/schemas/flight_layover.py - FlightLayover Pydantic schemas

Defines FlightLayover-related Pydantic models: `FlightLayoverBase`,
`FlightLayoverCreate`, `FlightLayoverUpdate`, and `FlightLayover`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional


class FlightLayoverBase(BaseModel):
    airport_name: str
    airport_code: Optional[str] = None
    terminal: Optional[str] = None
    gate: Optional[str] = None
    arrival_datetime: Optional[datetime] = None
    departure_datetime: Optional[datetime] = None
    connecting_flight_number: Optional[str] = None
    connecting_airline: Optional[str] = None
    notes: Optional[str] = None
    order: int = 0

    @model_validator(mode="after")
    def validate_times(self):
        if self.arrival_datetime and self.departure_datetime:
            if self.arrival_datetime > self.departure_datetime:
                raise ValueError("Arrival must be before departure at a layover")
        return self


class FlightLayoverCreate(FlightLayoverBase):
    journey_id: int


class FlightLayoverUpdate(BaseModel):
    airport_name: Optional[str] = None
    airport_code: Optional[str] = None
    terminal: Optional[str] = None
    gate: Optional[str] = None
    arrival_datetime: Optional[datetime] = None
    departure_datetime: Optional[datetime] = None
    connecting_flight_number: Optional[str] = None
    connecting_airline: Optional[str] = None
    notes: Optional[str] = None
    order: Optional[int] = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.arrival_datetime and self.departure_datetime:
            if self.arrival_datetime > self.departure_datetime:
                raise ValueError("Arrival must be before departure at a layover")
        return self


class FlightLayover(FlightLayoverBase):
    id: int
    journey_id: int

    model_config = ConfigDict(from_attributes=True)
