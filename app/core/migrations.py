"""
app/core/migrations.py - Simple database migrations for SQLite

Adds missing columns to existing tables without requiring Alembic.
This is a stopgap until proper migrations are set up.

Author: Travel Planner Team
"""

import logging
from typing import Optional, Set

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def get_existing_columns(engine: Engine, table_name: str) -> Set[str]:
    """Get the set of existing column names for a table."""
    inspector = inspect(engine)
    try:
        columns = inspector.get_columns(table_name)
        return {col["name"] for col in columns}
    except Exception:
        return set()


def add_column_if_not_exists(
    engine: Engine,
    table_name: str,
    column_name: str,
    column_type: str,
    default: Optional[str] = None,
) -> bool:
    """Add a column to a table if it doesn't already exist."""
    existing_columns = get_existing_columns(engine, table_name)

    if column_name in existing_columns:
        return False

    # Build ALTER TABLE statement
    sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
    if default is not None:
        sql += f" DEFAULT {default}"

    try:
        with engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
        logger.info("Added column %s to %s", column_name, table_name)
        return True
    except Exception as exc:
        logger.warning(
            "Could not add column %s to %s: %s", column_name, table_name, exc
        )
        return False


def run_migrations(engine: Engine) -> None:
    """Run all pending migrations."""
    logger.info("Running database migrations...")

    # Journey route details columns (Feature 016)
    journey_columns = [
        ("distance_km", "NUMERIC(10, 2)", "NULL"),
        ("distance_miles", "NUMERIC(10, 2)", "NULL"),
        ("estimated_duration_minutes", "INTEGER", "NULL"),
        ("route_type", "VARCHAR(50)", "NULL"),
        ("has_tolls", "BOOLEAN", "0"),
        ("toll_cost", "NUMERIC(10, 2)", "NULL"),
        ("route_notes", "TEXT", "NULL"),
    ]

    migrations_run = 0
    for col_name, col_type, default in journey_columns:
        if add_column_if_not_exists(engine, "journeys", col_name, col_type, default):
            migrations_run += 1

    if migrations_run > 0:
        logger.info("Completed %s migration(s)", migrations_run)
    else:
        logger.info("No migrations needed")
