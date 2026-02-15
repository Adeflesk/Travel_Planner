"""
app/schemas/destination.py - Destination Pydantic schemas

Defines Destination-related Pydantic models: `DestinationBase`,
`DestinationCreate`, `DestinationUpdate`, and `Destination`.

Author: Travel Planner Team
"""

from datetime import date as DateType
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DestinationBase(BaseModel):
    name: str
    country: Optional[str] = None
    region: Optional[str] = None
    arrival_date: Optional[DateType] = None
    departure_date: Optional[DateType] = None
    notes: Optional[str] = None
    order: int = 0


class DestinationCreate(DestinationBase):
    trip_id: int


class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    arrival_date: Optional[DateType] = None
    departure_date: Optional[DateType] = None
    notes: Optional[str] = None
    order: Optional[int] = None


class Destination(DestinationBase):
    id: int
    trip_id: int

    model_config = ConfigDict(from_attributes=True)
