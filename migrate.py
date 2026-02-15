#!/usr/bin/env python
"""
Database migration script for Fly.io deployments.
Creates all tables and runs migrations.
"""

import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.migrations import run_migrations  # noqa: E402
from app.models.activity import Activity  # noqa: E402, F401
from app.models.base import Base  # noqa: E402
from app.models.destination import Destination  # noqa: E402, F401
from app.models.expense import Expense  # noqa: E402, F401
from app.models.journey import Journey  # noqa: E402, F401
from app.models.journey_document import JourneyDocument  # noqa: E402, F401
from app.models.journey_option import JourneyOption  # noqa: E402, F401
from app.models.journey_stop import JourneyStop  # noqa: E402, F401
from app.models.packing_item import PackingItem  # noqa: E402, F401
from app.models.stop_option import StopOption  # noqa: E402, F401
from app.models.trip import Trip  # noqa: E402, F401
from app.models.trip_share import TripShare  # noqa: E402, F401

# Import all models to register them with Base
from app.models.user import User  # noqa: E402, F401
from database import engine  # noqa: E402

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✓ Tables created")

print("Running migrations...")
run_migrations(engine)
print("✓ Migrations complete")

print("Database setup complete!")
