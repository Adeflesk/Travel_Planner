from sqlalchemy import Column, Integer, Text, Date, ForeignKey, UniqueConstraint
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

    __table_args__ = (UniqueConstraint("trip_id", "date", name="uq_trip_day"),)
