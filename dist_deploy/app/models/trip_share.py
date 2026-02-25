"""
app/models/trip_share.py - TripShare SQLAlchemy model

Defines the `TripShare` model for sharing trips between users.

Author: Travel Planner Team
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base


class TripShare(Base):
    __tablename__ = "trip_shares"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    permission = Column(String(20), default="view")  # "view" only for now
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    trip = relationship("Trip", back_populates="shares")
    user = relationship("User", back_populates="shared_trips")

    # Unique constraint: one share per user per trip
    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", name="unique_trip_user_share"),
    )

    def __repr__(self):
        return f"<TripShare(trip_id={self.trip_id}, user_id={self.user_id}, permission='{self.permission}')>"
