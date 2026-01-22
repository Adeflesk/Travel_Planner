# schemas.py
from pydantic import BaseModel, ConfigDict
from datetime import date, time, datetime
from decimal import Decimal
from typing import Optional, List


# Trip Schemas
class TripBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    budget: Optional[Decimal] = None
    status: str = "planning"


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
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
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None
    accommodation_name: Optional[str] = None
    accommodation_address: Optional[str] = None
    notes: Optional[str] = None
    order: int = 0


class DestinationCreate(DestinationBase):
    trip_id: int


class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None
    accommodation_name: Optional[str] = None
    accommodation_address: Optional[str] = None
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
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: str = "planned"
    priority: Optional[int] = None


class ActivityCreate(ActivityBase):
    destination_id: int


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None


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
    date: date
    paid_by: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    date: Optional[date] = None
    paid_by: Optional[str] = None


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
