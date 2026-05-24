from sqlalchemy import Column, Integer, Text, Date, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base


class TripDay(Base):
    __tablename__ = "trip_days"

    id = Column(Integer, primary_key=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    date = Column(Date, nullable=False)
    title = Column(Text)
    location = Column(Text)
    notes = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0)
    destination_id = Column(
        Integer, ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True
    )
    alerts = Column(JSON, nullable=True)

    __table_args__ = (UniqueConstraint("trip_id", "date", name="uq_trip_day"),)

    trip = relationship("Trip", back_populates="days")
    destination = relationship("Destination", back_populates="days")
    activities = relationship(
        "DayActivity", back_populates="day", cascade="all, delete-orphan"
    )
    departing_transports = relationship(
        "TripTransport",
        foreign_keys="TripTransport.departure_day_id",
        back_populates="departure_day",
    )
    arriving_transports = relationship(
        "TripTransport",
        foreign_keys="TripTransport.arrival_day_id",
        back_populates="arrival_day",
    )
