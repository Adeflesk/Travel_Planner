"""
app/models/activity.py - Activity SQLAlchemy model

Defines the `Activity` model and its relationships to destination and expenses.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import relationship

from .base import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    activity_type = Column(String(50))
    scheduled_date = Column(Date)
    scheduled_time = Column(Time)
    duration = Column(Integer)
    cost = Column(Numeric(10, 2))
    booking_reference = Column(String(100))
    status = Column(String(50), default="planned")
    priority = Column(Integer)
    is_todo = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)

    destination = relationship("Destination", back_populates="activities")
    expenses = relationship("Expense", back_populates="activity")
