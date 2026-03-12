from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship

from .base import Base


class TripTransport(Base):
    __tablename__ = "trip_transports"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    transport_type = Column(
        String(20), nullable=False
    )  # flight|train|bus|drive|ferry|other
    origin = Column(Text, nullable=False)
    destination = Column(Text, nullable=False)
    departure_day_id = Column(
        Integer, ForeignKey("trip_days.id", ondelete="SET NULL"), nullable=True
    )
    arrival_day_id = Column(
        Integer, ForeignKey("trip_days.id", ondelete="SET NULL"), nullable=True
    )
    departure_time = Column(String(5))  # "HH:MM"
    arrival_time = Column(String(5))  # "HH:MM"
    carrier = Column(String(200))
    reference = Column(String(200))  # booking ref / flight number / train code
    cost = Column(Float)
    currency = Column(String(10))
    notes = Column(Text)
    booked = Column(Boolean, nullable=False, default=False)
    booking_reminder_sent = Column(Boolean, nullable=False, default=False)
    overnight = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    origin_latitude = Column(Float, nullable=True)
    origin_longitude = Column(Float, nullable=True)
    destination_latitude = Column(Float, nullable=True)
    destination_longitude = Column(Float, nullable=True)
    origin_timezone = Column(String(50), nullable=True)
    destination_timezone = Column(String(50), nullable=True)
    extra = Column(
        JSON
    )  # type-specific metadata (flight_number, distance_km, frequency)

    trip = relationship("Trip", back_populates="transports")
    departure_day = relationship(
        "TripDay",
        foreign_keys=[departure_day_id],
        back_populates="departing_transports",
    )
    arrival_day = relationship(
        "TripDay", foreign_keys=[arrival_day_id], back_populates="arriving_transports"
    )
    options = relationship(
        "TransportOption", back_populates="transport", cascade="all, delete-orphan"
    )
    expenses = relationship(
        "Expense", foreign_keys="Expense.transport_id", back_populates="transport"
    )
