"""
app/models/segment_option.py - Segment Option model

Represents alternative transport options for a journey segment
(e.g., comparing Uber vs taxi vs shuttle for an airport transfer)
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Text
from app.models.base import Base


class SegmentOption(Base):
    __tablename__ = "segment_options"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("journey_segments.id"), nullable=False)

    # Option details
    name = Column(String(200), nullable=False)
    provider = Column(String(100), nullable=True)  # Company/service name
    frequency = Column(String(100), nullable=True)  # "Every 15 min", "Hourly"
    estimated_duration = Column(Integer, nullable=True)  # Duration in minutes

    # Cost information
    cost = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")

    # Booking details
    booking_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Status tracking
    status = Column(String(20), nullable=False, default="researching")
    # Statuses: researching, selected, booked, rejected

    # Display order
    order = Column(Integer, default=0, nullable=False)
