"""
app/models/base.py - SQLAlchemy declarative base

Provides the shared SQLAlchemy declarative `Base` used by all model modules.

Author: Travel Planner Team
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()
