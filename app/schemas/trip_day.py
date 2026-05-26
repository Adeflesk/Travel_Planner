import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict
from .day_activity import DayActivityResponse


class DayAlert(BaseModel):
    text: str
    severity: Literal["warning", "info", "tip"]


class TripDayBase(BaseModel):
    trip_id: int
    date: datetime.date
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0
    destination_id: Optional[int] = None
    alerts: Optional[List[DayAlert]] = None


class TripDayCreate(TripDayBase):
    pass


class TripDayUpdate(BaseModel):
    date: Optional[datetime.date] = None
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None
    destination_id: Optional[int] = None
    alerts: Optional[List[DayAlert]] = None


class TripDayResponse(TripDayBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activities: List[DayActivityResponse] = []
