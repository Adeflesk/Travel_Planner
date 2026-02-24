from datetime import date
from typing import Optional
from pydantic import BaseModel


class TripDayBase(BaseModel):
    trip_id: int
    date: date
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0


class TripDayCreate(TripDayBase):
    pass


class TripDayUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class TripDayResponse(TripDayBase):
    id: int

    class Config:
        from_attributes = True
