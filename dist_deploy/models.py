"""
models.py - Backward compatibility shim

This module re-exports the models from `app.models` to preserve existing
imports until callers are updated to the new package layout.

Author: Travel Planner Team
"""

from app.models import *  # noqa: F401,F403
