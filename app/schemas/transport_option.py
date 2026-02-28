from typing import Literal, Any
from pydantic import BaseModel, ConfigDict

TransportOptionStatus = Literal["researching", "selected", "booked", "rejected"]
TransportType = Literal["flight", "train", "bus", "drive", "ferry", "other"]


class TransportOptionBase(BaseModel):
    transport_type: TransportType
    name: str
    carrier: str | None = None
    duration_minutes: int | None = None
    cost: float | None = None
    currency: str | None = None
    frequency: str | None = None
    booking_url: str | None = None
    notes: str | None = None
    status: TransportOptionStatus = "researching"
    extra: dict[str, Any] | None = None
    order: int = 0


class TransportOptionCreate(TransportOptionBase):
    pass


class TransportOptionUpdate(BaseModel):
    transport_type: TransportType | None = None
    name: str | None = None
    carrier: str | None = None
    duration_minutes: int | None = None
    cost: float | None = None
    currency: str | None = None
    frequency: str | None = None
    booking_url: str | None = None
    notes: str | None = None
    status: TransportOptionStatus | None = None
    extra: dict[str, Any] | None = None
    order: int | None = None


class TransportOptionRead(TransportOptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transport_id: int
