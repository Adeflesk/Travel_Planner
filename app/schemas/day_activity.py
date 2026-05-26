import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, model_validator


class DayActivityBase(BaseModel):
    title: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: bool = False
    sort_order: int = 0
    is_todo: bool = False
    is_completed: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    book_by_date: datetime.date | None = None


class DayActivityCreate(DayActivityBase):
    day_id: Optional[int] = None
    destination_id: Optional[int] = None

    @model_validator(mode="after")
    def check_at_least_one_parent(self) -> "DayActivityCreate":
        if self.day_id is None and self.destination_id is None:
            raise ValueError("At least one of day_id or destination_id must be set")
        return self


class DayActivityUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: Optional[bool] = None
    sort_order: Optional[int] = None
    is_todo: Optional[bool] = None
    is_completed: Optional[bool] = None
    destination_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    book_by_date: datetime.date | None = None


class DayActivityResponse(DayActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_id: Optional[int] = None
    destination_id: Optional[int] = None
