"""
app/routers/__init__.py - Re-export routers

Collects APIRouter instances for inclusion by the application factory.

Author: Travel Planner Team
"""

from .activities import router as activities_router
from .admin import router as admin_router
from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .destinations import router as destinations_router
from .expenses import router as expenses_router
from .flight_layovers import router as flight_layovers_router
from .health import router as health_router
from .journey_documents import router as journey_documents_router
from .journey_options import router as journey_options_router
from .journey_segments import router as journey_segments_router
from .journey_stops import router as journey_stops_router
from .journeys import router as journeys_router
from .packing import router as packing_router
from .stop_options import router as stop_options_router
from .suggestions import router as suggestions_router
from .trips import router as trips_router

__all__ = [
    "health_router",
    "auth_router",
    "admin_router",
    "trips_router",
    "destinations_router",
    "activities_router",
    "expenses_router",
    "packing_router",
    "journeys_router",
    "journey_stops_router",
    "journey_segments_router",
    "stop_options_router",
    "journey_documents_router",
    "journey_options_router",
    "flight_layovers_router",
    "dashboard_router",
    "suggestions_router",
]
