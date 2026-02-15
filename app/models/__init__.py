"""
app/models/__init__.py - Re-export SQLAlchemy models

Provides convenient imports for all model classes.

Author: Travel Planner Team
"""

from .base import Base
from .user import User, UserRole
from .trip import Trip
from .trip_share import TripShare
from .destination import Destination
from .activity import Activity
from .expense import Expense
from .packing_item import PackingItem
from .journey import Journey
from .journey_stop import JourneyStop
from .stop_option import StopOption
from .journey_document import JourneyDocument
from .journey_segment import JourneySegment
from .segment_option import SegmentOption

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Trip",
    "TripShare",
    "Destination",
    "Activity",
    "Expense",
    "PackingItem",
    "Journey",
    "JourneyStop",
    "StopOption",
    "JourneyDocument",
    "JourneySegment",
    "SegmentOption",
]
