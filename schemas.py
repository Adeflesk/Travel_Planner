# schemas.py
from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from datetime import date as DateType, time, datetime
from decimal import Decimal
from typing import Optional


# Trip Schemas
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


# Destination Schemas
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


# Activity Schemas
class ActivityBase(BaseModel):
    name: str
    description: Optional[str] = None
    activity_type: Optional[str] = None
    scheduled_date: Optional[DateType] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: str = "planned"
    priority: Optional[int] = None
    is_todo: bool = False
    is_completed: bool = False


class ActivityCreate(ActivityBase):
    destination_id: int


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    scheduled_date: Optional[DateType] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    is_todo: Optional[bool] = None
    is_completed: Optional[bool] = None


class Activity(ActivityBase):
    id: int
    destination_id: int

    model_config = ConfigDict(from_attributes=True)


# Expense Schemas
class ExpenseBase(BaseModel):
    category: str
    amount: Decimal
    currency: str = "USD"
    description: Optional[str] = None
    date: DateType
    booked: bool = False
    paid: bool = False
    cancel_by_date: Optional[DateType] = None


class ExpenseCreate(ExpenseBase):
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    date: Optional[DateType] = None
    booked: Optional[bool] = None
    paid: Optional[bool] = None
    cancel_by_date: Optional[DateType] = None


class Expense(ExpenseBase):
    id: int
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# PackingItem Schemas
class PackingItemBase(BaseModel):
    item_name: str
    category: Optional[str] = None
    quantity: int = 1
    is_packed: bool = False


class PackingItemCreate(PackingItemBase):
    trip_id: int


class PackingItemUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    is_packed: Optional[bool] = None


class PackingItem(PackingItemBase):
    id: int
    trip_id: int

    model_config = ConfigDict(from_attributes=True)


# Journey Schemas
class JourneyBase(BaseModel):
    transport_mode: str  # flight, train, bus, car, ferry, walk
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
