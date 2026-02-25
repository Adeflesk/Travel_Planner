"""
app/schemas/journey_segment.py - Journey segment Pydantic schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class JourneySegmentBase(BaseModel):
    segment_type: str
    origin_id: Optional[int] = None
    origin_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    origin_timezone: Optional[str] = None
    destination_timezone: Optional[str] = None
    metadata: Optional[dict] = None
    order: int = 0


class JourneySegmentCreate(JourneySegmentBase):
    journey_id: int


class JourneySegmentUpdate(BaseModel):
    segment_type: Optional[str] = None
    origin_id: Optional[int] = None
    origin_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    origin_timezone: Optional[str] = None
    destination_timezone: Optional[str] = None
    metadata: Optional[dict] = None
    order: Optional[int] = None


class JourneySegment(JourneySegmentBase):
    id: int
    journey_id: int

    model_config = ConfigDict(from_attributes=True)
