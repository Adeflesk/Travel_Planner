"""
app/models/journey_stop.py - JourneyStop SQLAlchemy model

Defines the `JourneyStop` model for stops along a journey.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class JourneyStop(Base):
    __tablename__ = "journey_stops"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id"), nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(500), nullable=True)
    planned_arrival = Column(DateTime, nullable=True)
    planned_departure = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    actual_departure = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    order = Column(Integer, default=0)

    journey = relationship("Journey", back_populates="stops")
    options = relationship(
        "StopOption", back_populates="stop", cascade="all, delete-orphan"
    )
