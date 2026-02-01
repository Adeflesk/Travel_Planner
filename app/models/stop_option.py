"""
app/models/stop_option.py - StopOption SQLAlchemy model

Defines the `StopOption` model for options/activities at a journey stop.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class StopOption(Base):
    __tablename__ = "stop_options"

    id = Column(Integer, primary_key=True, index=True)
    stop_id = Column(Integer, ForeignKey("journey_stops.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    option_type = Column(String(50), nullable=False, default="other")
    estimated_duration = Column(Integer, nullable=True)  # Duration in minutes
    estimated_cost = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="USD")
    url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="considering")
    order = Column(Integer, default=0)

    stop = relationship("JourneyStop", back_populates="options")
