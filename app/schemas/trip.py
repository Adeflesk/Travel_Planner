"""
app/schemas/trip.py - Trip Pydantic schemas

Defines Trip-related Pydantic models: `TripBase`, `TripCreate`,
`TripUpdate`, and `Trip` (ORM mode enabled via ConfigDict).

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime, date as DateType
from decimal import Decimal
from typing import Optional


class TripBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: DateType
    end_date: DateType
    budget: Optional[Decimal] = None
    status: str = "planning"


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    budget: Optional[Decimal] = None
    status: Optional[str] = None


class Trip(TripBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
