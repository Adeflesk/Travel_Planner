from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .base import Base


class PreTripTask(Base):
    __tablename__ = "pre_trip_tasks"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        String(20), nullable=False, default="pending"
    )  # pending|booked|paid
    book_by_date = Column(Date, nullable=True)
    url = Column(Text, nullable=True)
    cost = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trip = relationship("Trip", back_populates="pre_trip_tasks")
