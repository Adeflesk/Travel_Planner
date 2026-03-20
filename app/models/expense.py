"""
app/models/expense.py - Expense SQLAlchemy model
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

activity_expenses = Table(
    "activity_expenses",
    Base.metadata,
    Column(
        "activity_id",
        Integer,
        ForeignKey("day_activities.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "expense_id",
        Integer,
        ForeignKey("expenses.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

transport_expenses = Table(
    "transport_expenses",
    Base.metadata,
    Column(
        "transport_id",
        Integer,
        ForeignKey("trip_transports.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "expense_id",
        Integer,
        ForeignKey("expenses.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

stop_expenses = Table(
    "stop_expenses",
    Base.metadata,
    Column(
        "destination_id",
        Integer,
        ForeignKey("destinations.id", ondelete="CASCADE"),
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
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    activity_id = Column(Integer, ForeignKey("day_activities.id"), nullable=True)
    transport_id = Column(Integer, ForeignKey("trip_transports.id"), nullable=True)
    accommodation_id = Column(
        Integer, ForeignKey("accommodations.id", ondelete="SET NULL"), nullable=True
    )

    category = Column(String(50), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    exchange_rate = Column(
        Numeric(12, 6), default=1.0, nullable=False, server_default="1.0"
    )
    base_amount = Column(Numeric(10, 2), nullable=True)
    description = Column(String(200))
    date = Column(Date, nullable=False)
    booked = Column(Boolean, default=False)
    paid = Column(Boolean, default=False)
    cancel_by_date = Column(Date, nullable=True)

    trip = relationship("Trip", back_populates="expenses")
    destination = relationship("Destination", back_populates="expenses")
    activity = relationship(
        "DayActivity", foreign_keys=[activity_id], back_populates="expenses"
    )
    transport = relationship(
        "TripTransport", foreign_keys=[transport_id], back_populates="expenses"
    )
    accommodation = relationship(
        "Accommodation", foreign_keys=[accommodation_id], back_populates="expenses"
    )
    linked_activities = relationship(
        "DayActivity",
        secondary=activity_expenses,
        backref="linked_expenses",
        overlaps="activity,expenses",
    )
    linked_transports = relationship(
        "TripTransport",
        secondary=transport_expenses,
        backref="linked_expenses",
        overlaps="transport,expenses",
    )
    linked_stops = relationship(
        "Destination",
        secondary=stop_expenses,
        backref="linked_expenses",
        overlaps="destination,expenses",
    )
