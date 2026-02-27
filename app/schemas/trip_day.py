import datetime
from typing import List, Optional
from pydantic import BaseModel
from .day_activity import DayActivityResponse
from .journey import Journey as JourneyResponse


class TripDayBase(BaseModel):
    trip_id: int
    date: datetime.date
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0


class TripDayCreate(TripDayBase):
    pass


class TripDayUpdate(BaseModel):
    date: Optional[datetime.date] = None
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class TripDayResponse(TripDayBase):
    id: int
    activities: List[DayActivityResponse] = []
    journeys: List[JourneyResponse] = []

    class Config:
        from_attributes = True
