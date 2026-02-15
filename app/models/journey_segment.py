"""
app/models/journey_segment.py - JourneySegment SQLAlchemy model

Defines the `JourneySegment` model for segment-based journeys.

Author: Travel Planner Team
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class JourneySegment(Base):
    __tablename__ = "journey_segments"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id"), nullable=False)
    segment_type = Column(String(20), nullable=False)
    origin_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    origin_name = Column(String(200), nullable=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    destination_name = Column(String(200), nullable=True)
    start_datetime = Column(DateTime, nullable=True)
    end_datetime = Column(DateTime, nullable=True)
    origin_timezone = Column(String(50), nullable=True)
    destination_timezone = Column(String(50), nullable=True)
    metadata_json = Column(Text, nullable=True)
    order = Column(Integer, default=0, nullable=False)

    journey = relationship("Journey", back_populates="segments")
    origin = relationship("Destination", foreign_keys=[origin_id])
    destination = relationship("Destination", foreign_keys=[destination_id])
