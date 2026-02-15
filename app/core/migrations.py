"""
app/core/migrations.py - Simple database migrations for SQLite

Adds missing columns to existing tables without requiring Alembic.
This is a stopgap until proper migrations are set up.

Author: Travel Planner Team
"""

import logging
from typing import Optional, Set

from sqlalchemy import text, inspect
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
        logger.info(f"Added column {column_name} to {table_name}")
        return True
    except Exception as e:
        logger.warning(f"Could not add column {column_name} to {table_name}: {e}")
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

    trip_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
    ]

    destination_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
    ]

    migrations_run = 0
    for col_name, col_type, default in journey_columns:
        if add_column_if_not_exists(engine, "journeys", col_name, col_type, default):
            migrations_run += 1

    # Trip budget threshold columns (Feature 018)
    trip_threshold_columns = [
        ("budget_warning_threshold", "INTEGER", "75"),
        ("budget_danger_threshold", "INTEGER", "90"),
    ]

    for col_name, col_type, default in trip_threshold_columns:
        if add_column_if_not_exists(engine, "trips", col_name, col_type, default):
            migrations_run += 1

    # Trip and destination timezone columns (for timezone prefill feature)
    for col_name, col_type, default in trip_columns:
        if add_column_if_not_exists(engine, "trips", col_name, col_type, default):
            migrations_run += 1

    for col_name, col_type, default in destination_columns:
        if add_column_if_not_exists(
            engine, "destinations", col_name, col_type, default
        ):
            migrations_run += 1

    if migrations_run > 0:
        logger.info(f"Completed {migrations_run} migration(s)")
    else:
        logger.info("No migrations needed")
