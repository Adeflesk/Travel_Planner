"""
app/models/journey.py - Journey SQLAlchemy model

Defines the `Journey` model and its relationships to trip and destination.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Numeric,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class Journey(Base):
    __tablename__ = "journeys"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    origin_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
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

    trip = relationship("Trip", back_populates="journeys")
    origin = relationship(
        "Destination", foreign_keys=[origin_id], backref="departing_journeys"
    )
    destination = relationship(
        "Destination", foreign_keys=[destination_id], backref="arriving_journeys"
    )
