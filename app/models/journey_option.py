"""
app/models/journey_option.py - JourneyOption SQLAlchemy model

Defines the `JourneyOption` model for tracking alternative booking options
during the research phase of journey planning.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from .base import Base


class JourneyOption(Base):
    __tablename__ = "journey_options"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id"), nullable=False)

    # Option details
    name = Column(String(200), nullable=False)
    carrier = Column(String(100), nullable=True)
    transport_mode = Column(String(50), nullable=True)  # bus/train/shuttle/taxi/uber
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
    order = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    journey = relationship("Journey", back_populates="options")
