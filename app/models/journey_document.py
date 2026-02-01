"""
app/models/journey_document.py - JourneyDocument SQLAlchemy model

Defines the `JourneyDocument` model for documents attached to journeys.

Author: Travel Planner Team
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class JourneyDocument(Base):
    __tablename__ = "journey_documents"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id"), nullable=False)
    name = Column(String(200), nullable=False)
    document_type = Column(String(50), nullable=False, default="other")
    file_path = Column(String(500), nullable=True)  # Path to uploaded file
    url = Column(String(500), nullable=True)  # External URL/link
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    journey = relationship("Journey", back_populates="documents")
