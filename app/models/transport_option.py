from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from .base import Base


class TransportOption(Base):
    __tablename__ = "transport_options"

    id = Column(Integer, primary_key=True, index=True)
    transport_id = Column(
        Integer, ForeignKey("trip_transports.id", ondelete="CASCADE"), nullable=False
    )
    transport_type = Column(
        String(20), nullable=False
    )  # flight|train|bus|drive|ferry|other
    name = Column(String(200), nullable=False)
    carrier = Column(String(200))
    duration_minutes = Column(Integer)
    cost = Column(Float)
    currency = Column(String(10))
    frequency = Column(String(100))  # "every 2 hours", "3x daily"
    booking_url = Column(Text)
    notes = Column(Text)
    status = Column(
        String(20), nullable=False, default="researching"
    )  # researching|selected|booked|rejected
    extra = Column(JSON)  # type-specific metadata
    order = Column(Integer, nullable=False, default=0)

    transport = relationship("TripTransport", back_populates="options")
