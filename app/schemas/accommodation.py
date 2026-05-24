from pydantic import BaseModel
from datetime import date as DateType
from typing import Optional


class AccommodationBase(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    check_in_date: Optional[DateType] = None
    check_out_date: Optional[DateType] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    confirmation_number: Optional[str] = None
    booking_url: Optional[str] = None
    contact_phone: Optional[str] = None
    cancellation_policy: Optional[str] = None
    cancel_by_date: Optional[DateType] = None
    booked: Optional[bool] = None
    paid: Optional[bool] = None
    notes: Optional[str] = None


class AccommodationCreate(AccommodationBase):
    destination_id: int
    trip_id: int
    name: str
    check_in_date: DateType
    check_out_date: DateType
    booked: bool = False
    paid: bool = False


class AccommodationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    check_in_date: Optional[DateType] = None
    check_out_date: Optional[DateType] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    confirmation_number: Optional[str] = None
    booking_url: Optional[str] = None
    contact_phone: Optional[str] = None
    cancellation_policy: Optional[str] = None
    cancel_by_date: Optional[DateType] = None
    booked: Optional[bool] = None
    paid: Optional[bool] = None
    notes: Optional[str] = None


class Accommodation(AccommodationBase):
    id: int
    destination_id: int
    trip_id: int
    name: str
    check_in_date: DateType
    check_out_date: DateType
    booked: bool
    paid: bool

    model_config = {"from_attributes": True}
