"""
app/models/__init__.py - Re-export SQLAlchemy models

Provides convenient imports for all model classes.

Author: Travel Planner Team
"""

from .base import Base
from .user import User, UserRole
from .trip import Trip
from .trip_share import TripShare
from .trip_day import TripDay
from .user_settings import UserSettings
from .destination import Destination
from .expense import Expense
from .packing_item import PackingItem
from .day_activity import DayActivity
from .trip_transport import TripTransport
from .transport_option import TransportOption
from .accommodation import Accommodation
from .password_reset_token import PasswordResetToken
from .rate_snapshot import RateSnapshot

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Trip",
    "TripShare",
    "Destination",
    "Expense",
    "PackingItem",
    "TripDay",
    "DayActivity",
    "UserSettings",
    "TripTransport",
    "TransportOption",
    "Accommodation",
    "PasswordResetToken",
    "RateSnapshot",
]
