"""
app/models/packing_item.py - PackingItem SQLAlchemy model

Defines the `PackingItem` model and its relationship to a trip.

Author: Travel Planner Team
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class PackingItem(Base):
    __tablename__ = "packing_items"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    category = Column(String(50))
    quantity = Column(Integer, default=1)
    is_packed = Column(Boolean, default=False)

    trip = relationship("Trip", back_populates="packing_items")
