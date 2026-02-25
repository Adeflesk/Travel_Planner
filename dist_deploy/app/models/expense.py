"""
app/models/expense.py - Expense SQLAlchemy model

Defines the Expense model. Expenses link to segments and activities via
dedicated join tables (segment_expenses, activity_expenses) for clean
many-to-many relationships. The legacy nullable FK columns are preserved
for backwards compatibility with existing data.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Numeric,
    Boolean,
    ForeignKey,
    Table,
)
from sqlalchemy.orm import relationship

from .base import Base

# Link tables
segment_expenses = Table(
    "segment_expenses",
    Base.metadata,
    Column(
        "segment_id",
        Integer,
        ForeignKey("journey_segments.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "expense_id",
        Integer,
        ForeignKey("expenses.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

activity_expenses = Table(
    "activity_expenses",
    Base.metadata,
    Column(
        "activity_id",
        Integer,
        ForeignKey("activities.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "expense_id",
        Integer,
        ForeignKey("expenses.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    # Legacy nullable FK columns — preserved for existing data
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

    # Link table relationships
    linked_segments = relationship(
        "JourneySegment",
        secondary=segment_expenses,
        backref="linked_expenses",
        overlaps="segment,expenses",
    )
    linked_activities = relationship(
        "Activity",
        secondary=activity_expenses,
        backref="linked_expenses",
        overlaps="activity,expenses",
    )
