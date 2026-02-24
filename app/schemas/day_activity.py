from typing import Optional
from pydantic import BaseModel


class DayActivityBase(BaseModel):
    day_id: int
    start_time: str
    end_time: Optional[str] = None
    title: str
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: bool = False
    sort_order: int = 0


class DayActivityCreate(DayActivityBase):
    pass


class DayActivityUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: Optional[bool] = None
    sort_order: Optional[int] = None


class DayActivityResponse(DayActivityBase):
    id: int

    class Config:
        from_attributes = True
