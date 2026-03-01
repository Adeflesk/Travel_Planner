"""
app/models/destination.py - Destination SQLAlchemy model

Defines the `Destination` model and its relationships to trip, activities and
expenses.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    name = Column(String(200), nullable=False)
    country = Column(String(100))
    region = Column(String(100))
    timezone = Column(String(50), nullable=True)
    arrival_date = Column(Date)
    departure_date = Column(Date)
    notes = Column(Text)
    order = Column(Integer, default=0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    trip = relationship("Trip", back_populates="destinations")
    day_activities = relationship(
        "DayActivity", back_populates="destination", cascade="all, delete-orphan"
    )
    expenses = relationship("Expense", back_populates="destination")
    days = relationship("TripDay", back_populates="destination")
