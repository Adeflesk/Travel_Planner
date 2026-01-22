# models.py
from sqlalchemy import Column, Integer, String, Text, Date, Time, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    budget = Column(Numeric(10, 2))
    status = Column(String(50), default="planning")  # planning, booked, ongoing, completed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    destinations = relationship("Destination", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    packing_items = relationship("PackingItem", back_populates="trip", cascade="all, delete-orphan")


class Destination(Base):
    __tablename__ = "destinations"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    name = Column(String(200), nullable=False)
    country = Column(String(100))
    arrival_date = Column(Date)
    departure_date = Column(Date)
    accommodation_name = Column(String(200))
    accommodation_address = Column(Text)
    notes = Column(Text)
    order = Column(Integer, default=0)
    
    # Relationships
    trip = relationship("Trip", back_populates="destinations")
    activities = relationship("Activity", back_populates="destination", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="destination")


class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    activity_type = Column(String(50))  # sightseeing, dining, transport, etc.
    scheduled_date = Column(Date)
    scheduled_time = Column(Time)
    duration = Column(Integer)  # in minutes
    cost = Column(Numeric(10, 2))
    booking_reference = Column(String(100))
    status = Column(String(50), default="planned")  # planned, booked, completed
    priority = Column(Integer)
    
    # Relationships
    destination = relationship("Destination", back_populates="activities")
    expenses = relationship("Expense", back_populates="activity")


class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    category = Column(String(50), nullable=False)  # accommodation, food, transport, etc.
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(String(200))
    date = Column(Date, nullable=False)
    paid_by = Column(String(100))
    
    # Relationships
    trip = relationship("Trip", back_populates="expenses")
    destination = relationship("Destination", back_populates="expenses")
    activity = relationship("Activity", back_populates="expenses")


class PackingItem(Base):
    __tablename__ = "packing_items"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    category = Column(String(50))  # clothing, toiletries, electronics, documents, etc.
    quantity = Column(Integer, default=1)
    is_packed = Column(Boolean, default=False)
    
    # Relationships
    trip = relationship("Trip", back_populates="packing_items")