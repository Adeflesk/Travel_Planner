from __future__ import annotations
from typing import Literal, Any
from pydantic import BaseModel, ConfigDict

TransportType = Literal["flight", "train", "bus", "drive", "ferry", "other"]


class TransportOptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transport_id: int
    transport_type: TransportType
    name: str
    carrier: str | None = None
    duration_minutes: int | None = None
    cost: float | None = None
    currency: str | None = None
    frequency: str | None = None
    booking_url: str | None = None
    notes: str | None = None
    status: str
    extra: dict[str, Any] | None = None
    order: int


class TripTransportBase(BaseModel):
    transport_type: TransportType
    origin: str
    destination: str
    departure_day_id: int | None = None
    arrival_day_id: int | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    carrier: str | None = None
    reference: str | None = None
    cost: float | None = None
    currency: str | None = None
    notes: str | None = None
    booked: bool = False
    overnight: bool = False
    sort_order: int = 0
    origin_latitude: float | None = None
    origin_longitude: float | None = None
    destination_latitude: float | None = None
    destination_longitude: float | None = None
    origin_timezone: str | None = None
    destination_timezone: str | None = None
    extra: dict[str, Any] | None = None


class TripTransportCreate(TripTransportBase):
    pass


class TripTransportUpdate(BaseModel):
    transport_type: TransportType | None = None
    origin: str | None = None
    destination: str | None = None
    departure_day_id: int | None = None
    arrival_day_id: int | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    carrier: str | None = None
    reference: str | None = None
    cost: float | None = None
    currency: str | None = None
    notes: str | None = None
    booked: bool | None = None
    overnight: bool | None = None
    sort_order: int | None = None
    origin_latitude: float | None = None
    origin_longitude: float | None = None
    destination_latitude: float | None = None
    destination_longitude: float | None = None
    origin_timezone: str | None = None
    destination_timezone: str | None = None
    extra: dict[str, Any] | None = None


class TripTransportRead(TripTransportBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    options: list[TransportOptionRead] = []
