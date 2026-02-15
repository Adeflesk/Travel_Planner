"""
app/schemas/journey_segment.py - JourneySegment Pydantic schemas

Defines JourneySegment-related Pydantic models.

Author: Travel Planner Team
"""

from datetime import datetime
from typing import Dict, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, model_validator

SegmentType = Literal["TRANSFER", "BUS", "RAIL", "FLIGHT", "LAYOVER", "STOP"]
MetadataValue = Union[str, int, float, bool, None]
MetadataDict = Dict[str, MetadataValue]


class JourneySegmentBase(BaseModel):
    segment_type: SegmentType
    origin_id: Optional[int] = None
    origin_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    origin_timezone: Optional[str] = None
    destination_timezone: Optional[str] = None
    metadata: Optional[MetadataDict] = None
    order: int = 0

    @model_validator(mode="after")
    def validate_time_order(self):
        if self.start_datetime and self.end_datetime:
            if self.start_datetime >= self.end_datetime:
                raise ValueError("Segment start must be before end")
        return self


class JourneySegmentCreate(JourneySegmentBase):
    journey_id: int


class JourneySegmentUpdate(BaseModel):
    segment_type: Optional[SegmentType] = None
    origin_id: Optional[int] = None
    origin_name: Optional[str] = None
    destination_id: Optional[int] = None
    destination_name: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    origin_timezone: Optional[str] = None
    destination_timezone: Optional[str] = None
    metadata: Optional[MetadataDict] = None
    order: Optional[int] = None

    @model_validator(mode="after")
    def validate_time_order(self):
        if self.start_datetime and self.end_datetime:
            if self.start_datetime >= self.end_datetime:
                raise ValueError("Segment start must be before end")
        return self


class JourneySegment(JourneySegmentBase):
    id: int
    journey_id: int

    model_config = ConfigDict(from_attributes=True)
