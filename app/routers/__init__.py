"""
app/routers/__init__.py - Re-export routers

Collects APIRouter instances for inclusion by the application factory.

Author: Travel Planner Team
"""

from .health import router as health_router
from .trips import router as trips_router
from .destinations import router as destinations_router
from .activities import router as activities_router
from .expenses import router as expenses_router
from .packing import router as packing_router
from .journeys import router as journeys_router

__all__ = [
    "health_router",
    "trips_router",
    "destinations_router",
    "activities_router",
    "expenses_router",
    "packing_router",
    "journeys_router",
]
