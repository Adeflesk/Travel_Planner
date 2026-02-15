"""
app/models/flight_layover.py - FlightLayover SQLAlchemy model

Defines the `FlightLayover` model for layover stops on flight journeys.

Author: Travel Planner Team
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class FlightLayover(Base):
    __tablename__ = "flight_layovers"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id"), nullable=False)
    airport_name = Column(String(200), nullable=False)
    airport_code = Column(String(10), nullable=True)
    terminal = Column(String(50), nullable=True)
    gate = Column(String(50), nullable=True)
    arrival_datetime = Column(DateTime, nullable=True)
    departure_datetime = Column(DateTime, nullable=True)
    connecting_flight_number = Column(String(50), nullable=True)
    connecting_airline = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    order = Column(Integer, default=0)

    journey = relationship("Journey", back_populates="layovers")
