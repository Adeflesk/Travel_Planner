from sqlalchemy import Column, Integer, String, Text, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Accommodation(Base):
    __tablename__ = "accommodations"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(
        Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False
    )
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    expense_id = Column(
        Integer, ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True
    )

    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    cost = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    confirmation_number = Column(String(200), nullable=True)
    booking_url = Column(Text, nullable=True)
    contact_phone = Column(String(50), nullable=True)
    cancellation_policy = Column(Text, nullable=True)
    cancel_by_date = Column(Date, nullable=True)
    booked = Column(Boolean, nullable=False, default=False)
    paid = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    destination = relationship("Destination", back_populates="accommodations")
    trip = relationship("Trip", back_populates="accommodations")
    expense = relationship("Expense", foreign_keys=[expense_id])
