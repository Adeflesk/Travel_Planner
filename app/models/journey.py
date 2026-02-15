"""
app/models/journey.py - Journey SQLAlchemy model

Defines the `Journey` model and its relationships to trip and destination.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class Journey(Base):
    __tablename__ = "journeys"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    origin_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    # Text fields for locations not in destinations (e.g., home airport)
    origin_name = Column(String(200), nullable=True)
    destination_name = Column(String(200), nullable=True)
    transport_mode = Column(String(50), nullable=False)
    departure_datetime = Column(DateTime, nullable=True)
    arrival_datetime = Column(DateTime, nullable=True)
    carrier = Column(String(100))
    booking_reference = Column(String(100))
    cost = Column(Numeric(10, 2))
    currency = Column(String(3), default="USD")
    notes = Column(Text)
    status = Column(String(50), default="planned")
    order = Column(Integer, default=0)

    # Route details (primarily for road trips)
    distance_km = Column(Numeric(10, 2), nullable=True)
    distance_miles = Column(Numeric(10, 2), nullable=True)
    estimated_duration_minutes = Column(Integer, nullable=True)
    route_type = Column(String(50), nullable=True)  # fastest, shortest, scenic, etc.
    has_tolls = Column(Boolean, default=False)
    toll_cost = Column(Numeric(10, 2), nullable=True)
    route_notes = Column(Text, nullable=True)

    # Flexible booking fields
    is_booked = Column(Boolean, default=True, nullable=False)
    booking_opens_date = Column(Date, nullable=True)
    booking_deadline = Column(Date, nullable=True)
    frequency = Column(String(100), nullable=True)  # "Every 30 min", "Hourly", etc.
    flexibility_level = Column(String(20), default="exact", nullable=False)

    # Timezone fields (for flights and accurate time calculations)
    origin_timezone = Column(String(50), nullable=True)  # e.g., "America/Los_Angeles"
    destination_timezone = Column(String(50), nullable=True)  # e.g., "America/New_York"

    trip = relationship("Trip", back_populates="journeys")
    origin = relationship(
        "Destination", foreign_keys=[origin_id], backref="departing_journeys"
    )
    destination = relationship(
        "Destination", foreign_keys=[destination_id], backref="arriving_journeys"
    )
    stops = relationship(
        "JourneyStop", back_populates="journey", cascade="all, delete-orphan"
    )
    segments = relationship(
        "JourneySegment", back_populates="journey", cascade="all, delete-orphan"
    )
    documents = relationship(
        "JourneyDocument", back_populates="journey", cascade="all, delete-orphan"
    )
    layovers = relationship(
        "FlightLayover", back_populates="journey", cascade="all, delete-orphan"
    )
    options = relationship(
        "JourneyOption", back_populates="journey", cascade="all, delete-orphan"
    )
