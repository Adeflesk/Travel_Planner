"""
app/models/trip.py - Trip SQLAlchemy model

Defines the `Trip` model and its relationships to destinations, expenses,
packing items and journeys.

Author: Travel Planner Team
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .base import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    budget = Column(Numeric(10, 2))
    status = Column(String(50), default="planning")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Owner relationship
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # nullable for migration
    owner = relationship("User", back_populates="trips", foreign_keys=[user_id])

    # Sharing relationship
    shares = relationship(
        "TripShare", back_populates="trip", cascade="all, delete-orphan"
    )

    destinations = relationship(
        "Destination", back_populates="trip", cascade="all, delete-orphan"
    )
    expenses = relationship(
        "Expense", back_populates="trip", cascade="all, delete-orphan"
    )
    packing_items = relationship(
        "PackingItem", back_populates="trip", cascade="all, delete-orphan"
    )
    journeys = relationship(
        "Journey", back_populates="trip", cascade="all, delete-orphan"
    )
