from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .base import Base


class TransportStop(Base):
    __tablename__ = "transport_stops"

    id = Column(Integer, primary_key=True, index=True)
    transport_id = Column(
        Integer,
        ForeignKey("trip_transports.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    category = Column(String(20))  # viewpoint|lunch|fuel|trailhead|photo|rest|other
    duration_minutes = Column(Integer, nullable=True)  # null → default 30 + warning
    drive_minutes_from_previous = Column(
        Integer, nullable=True
    )  # from prev stop / origin
    locked_arrival_time = Column(String(5))  # "HH:MM", hard anchor in stop's timezone
    timezone = Column(String(50), nullable=True)  # IANA; falls back to leg zone
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    requires_daylight = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)

    transport = relationship("TripTransport", back_populates="stops")
