"""
app/models/__init__.py - Re-export SQLAlchemy models

Provides convenient imports for all model classes.

Author: Travel Planner Team
"""

from .activity import Activity
from .base import Base
from .destination import Destination
from .expense import Expense
from .flight_layover import FlightLayover
from .journey import Journey
from .journey_document import JourneyDocument
from .journey_option import JourneyOption
from .journey_segment import JourneySegment
from .journey_stop import JourneyStop
from .packing_item import PackingItem
from .stop_option import StopOption
from .trip import Trip
from .trip_share import TripShare
from .user import User, UserRole

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
    "JourneySegment",
    "StopOption",
    "JourneyDocument",
    "JourneyOption",
    "FlightLayover",
]
