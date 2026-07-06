from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict

StopCategory = Literal[
    "viewpoint", "lunch", "fuel", "trailhead", "photo", "rest", "other"
]


# ---------------------------------------------------------------------------
# CRUD schemas
# ---------------------------------------------------------------------------


class TransportStopBase(BaseModel):
    name: str
    category: StopCategory | None = None
    duration_minutes: int | None = None
    drive_minutes_from_previous: int | None = None
    locked_arrival_time: str | None = None  # "HH:MM"
    timezone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    requires_daylight: bool = False
    sort_order: int = 0


class TransportStopCreate(TransportStopBase):
    pass


class TransportStopUpdate(BaseModel):
    name: str | None = None
    category: StopCategory | None = None
    duration_minutes: int | None = None
    drive_minutes_from_previous: int | None = None
    locked_arrival_time: str | None = None
    timezone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    requires_daylight: bool | None = None
    sort_order: int | None = None


class TransportStopRead(TransportStopBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transport_id: int


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


class StopReorderItem(BaseModel):
    id: int
    sort_order: int


class StopReorderRequest(BaseModel):
    stops: list[StopReorderItem]


# ---------------------------------------------------------------------------
# Schedule response schemas
# ---------------------------------------------------------------------------


class ScheduleWarningOut(BaseModel):
    code: str
    stop_id: int | None = None
    message: str = ""


class ScheduleItemOut(BaseModel):
    id: int
    title: str
    arrival_local: str
    departure_local: str
    timezone: str
    duration_minutes: int
    drive_minutes_from_previous: int
    slack_before_minutes: int = 0
    overrun_minutes: int = 0


class ScheduleResponse(BaseModel):
    items: list[ScheduleItemOut] = []
    warnings: list[ScheduleWarningOut] = []
    day_start: str | None = None  # ISO 8601
    day_end: str | None = None  # ISO 8601
    sunset: str | None = None  # ISO 8601
