"""
app/models/expense.py - Expense SQLAlchemy model

Defines the `Expense` model and its relationships to trip, destination and activity.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Numeric,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    segment_option_id = Column(Integer, ForeignKey("segment_options.id"), nullable=True)
    stop_option_id = Column(Integer, ForeignKey("stop_options.id"), nullable=True)
    segment_id = Column(Integer, ForeignKey("journey_segments.id"), nullable=True)
    category = Column(String(50), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(String(200))
    date = Column(Date, nullable=False)
    booked = Column(Boolean, default=False)
    paid = Column(Boolean, default=False)
    cancel_by_date = Column(Date, nullable=True)

    trip = relationship("Trip", back_populates="expenses")
    destination = relationship("Destination", back_populates="expenses")
    activity = relationship("Activity", back_populates="expenses")
    segment_option = relationship("SegmentOption", backref="expenses")
    stop_option = relationship("StopOption", backref="expenses")
    segment = relationship("JourneySegment", back_populates="expenses")
