"""
app/routers/__init__.py - Re-export routers

Collects APIRouter instances for inclusion by the application factory.

Author: Travel Planner Team
"""

from .health import router as health_router
from .auth import router as auth_router
from .admin import router as admin_router
from .trips import router as trips_router
from .destinations import router as destinations_router
from .trip_days import router as trip_days_router
from .dashboard import router as dashboard_router
from .settings import router as settings_router
from .activities import router as activities_router
from .expenses import router as expenses_router
from .packing import router as packing_router
from .suggestions import router as suggestions_router
from .trip_transports import router as trip_transports_router
from .transport_options import router as transport_options_router
from .accommodations import router as accommodations_router
from .exchange_rates import router as exchange_rates_router
from .timezone import router as timezone_router

__all__ = [
    "health_router",
    "auth_router",
    "admin_router",
    "trips_router",
    "destinations_router",
    "activities_router",
    "expenses_router",
    "packing_router",
    "dashboard_router",
    "suggestions_router",
    "trip_days_router",
    "settings_router",
    "trip_transports_router",
    "transport_options_router",
    "accommodations_router",
    "exchange_rates_router",
    "timezone_router",
]
