"""
app/models/rate_snapshot.py - Exchange rate snapshot model

Stores historical exchange rate data points for monitoring and graphing.
Each row records the rate from one currency to another at a specific time.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from .base import Base


class RateSnapshot(Base):
    __tablename__ = "rate_snapshots"

    id = Column(Integer, primary_key=True)
    base_currency = Column(String(3), nullable=False, index=True)
    target_currency = Column(String(3), nullable=False, index=True)
    rate = Column(Numeric(12, 6), nullable=False)
    fetched_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
