"""
app/schemas/activity.py - Activity Pydantic schemas

Defines Activity-related Pydantic models: `ActivityBase`, `ActivityCreate`,
`ActivityUpdate`, and `Activity`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date as DateType, time
from decimal import Decimal
from typing import Optional


class ActivityBase(BaseModel):
    name: str
    description: Optional[str] = None
    activity_type: Optional[str] = None
    scheduled_date: Optional[DateType] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: str = "planned"
    priority: Optional[int] = None
    is_todo: bool = False
    is_completed: bool = False


class ActivityCreate(ActivityBase):
    destination_id: Optional[int] = None
    segment_id: Optional[int] = None

    @field_validator("destination_id")
    @classmethod
    def validate_at_least_one_link(cls, v, info):
        """Ensure at least one of destination_id or segment_id is provided"""
        segment_id = info.data.get("segment_id")
        if v is None and segment_id is None:
            raise ValueError(
                "At least one of destination_id or segment_id must be provided"
            )
        return v


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    scheduled_date: Optional[DateType] = None
    scheduled_time: Optional[time] = None
    duration: Optional[int] = None
    cost: Optional[Decimal] = None
    booking_reference: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    is_todo: Optional[bool] = None
    is_completed: Optional[bool] = None
    destination_id: Optional[int] = None
    segment_id: Optional[int] = None


class Activity(ActivityBase):
    id: int
    destination_id: Optional[int] = None
    segment_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
