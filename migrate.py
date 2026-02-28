#!/usr/bin/env python
"""
Database migration script for Fly.io deployments.
Creates all tables and runs migrations.
"""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.core.migrations import run_migrations  # noqa: E402

# Import all models to register them with Base
from app.models.user import User  # noqa: E402, F401
from app.models.trip import Trip  # noqa: E402, F401
from app.models.destination import Destination  # noqa: E402, F401
from app.models.activity import Activity  # noqa: E402, F401
from app.models.expense import Expense  # noqa: E402, F401
from app.models.packing_item import PackingItem  # noqa: E402, F401
from app.models.trip_share import TripShare  # noqa: E402, F401
from app.models.trip_day import TripDay  # noqa: E402, F401
from app.models.day_activity import DayActivity  # noqa: E402, F401
from app.models.user_settings import UserSettings  # noqa: E402, F401
from app.models.trip_transport import TripTransport  # noqa: E402, F401
from app.models.transport_option import TransportOption  # noqa: E402, F401

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✓ Tables created")

print("Running migrations...")
run_migrations(engine)
print("✓ Migrations complete")

print("Database setup complete!")
