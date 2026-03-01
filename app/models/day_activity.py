from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .base import Base


class DayActivity(Base):
    __tablename__ = "day_activities"

    id = Column(Integer, primary_key=True)
    day_id = Column(
        Integer, ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=True
    )
    destination_id = Column(
        Integer, ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True
    )
    start_time = Column(String(5))  # "HH:MM", nullable
    end_time = Column(String(5))
    title = Column(Text, nullable=False)
    category = Column(String(32))
    location = Column(Text)
    notes = Column(Text)
    cost = Column(Float)
    currency = Column(String(3))
    booked = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_todo = Column(Boolean, nullable=False, default=False)
    is_completed = Column(Boolean, nullable=False, default=False)

    day = relationship("TripDay", back_populates="activities")
    destination = relationship("Destination", back_populates="day_activities")
