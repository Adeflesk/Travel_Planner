import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict

PreTripTaskStatus = Literal["pending", "booked", "paid"]


class PreTripTaskBase(BaseModel):
    title: str
    description: str | None = None
    status: PreTripTaskStatus = "pending"
    book_by_date: datetime.date | None = None
    url: str | None = None
    cost: float | None = None
    currency: str | None = None
    sort_order: int = 0


class PreTripTaskCreate(PreTripTaskBase):
    pass


class PreTripTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: PreTripTaskStatus | None = None
    book_by_date: datetime.date | None = None
    url: str | None = None
    cost: float | None = None
    currency: str | None = None
    sort_order: int | None = None


class PreTripTaskRead(PreTripTaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    created_at: datetime.datetime
