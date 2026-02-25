"""
schemas.py - Backward compatibility shim

Re-exports schema classes from `app.schemas` to preserve existing imports
while consumers are migrated to the new package layout.

Author: Travel Planner Team
"""

from app.schemas import *  # noqa: F401,F403
