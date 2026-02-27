"""
app/core/migrations.py - Simple database migrations for SQLite

Adds missing columns to existing tables without requiring Alembic.
This is a stopgap until proper migrations are set up.

Author: Travel Planner Team
"""

import logging
from typing import Optional, Set

from sqlalchemy import text, inspect  # type: ignore
from sqlalchemy.engine import Engine  # type: ignore

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
        ("day_id", "INTEGER", "NULL"),
    ]

    trip_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
        ("context", "TEXT", "NULL"),
    ]

    destination_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
    ]

    applied_migrations: list[str] = []
    for col_name, col_type, default in journey_columns:
        if add_column_if_not_exists(engine, "journeys", col_name, col_type, default):
            applied_migrations.append(f"journeys.{col_name}")

    # Trip budget threshold columns (Feature 018)
    trip_threshold_columns = [
        ("budget_warning_threshold", "INTEGER", "75"),
        ("budget_danger_threshold", "INTEGER", "90"),
    ]

    for col_name, col_type, default in trip_threshold_columns:
        if add_column_if_not_exists(engine, "trips", col_name, col_type, default):
            applied_migrations.append(f"trips.{col_name}")

    # Trip and destination timezone columns (for timezone prefill feature)
    for col_name, col_type, default in trip_columns:
        if add_column_if_not_exists(engine, "trips", col_name, col_type, default):
            applied_migrations.append(f"trips.{col_name}")

    for col_name, col_type, default in destination_columns:
        if add_column_if_not_exists(
            engine, "destinations", col_name, col_type, default
        ):
            applied_migrations.append(f"destinations.{col_name}")

    # Expense link columns (Feature 022)
    expense_link_columns = [
        ("segment_option_id", "INTEGER", "NULL"),
        ("stop_option_id", "INTEGER", "NULL"),
        ("segment_id", "INTEGER", "NULL"),
    ]
    for col_name, col_type, default in expense_link_columns:
        if add_column_if_not_exists(engine, "expenses", col_name, col_type, default):
            applied_migrations.append(f"expenses.{col_name}")

    # Stop option segment link (Feature 021)
    if add_column_if_not_exists(
        engine, "stop_options", "segment_id", "INTEGER", "NULL"
    ):
        applied_migrations.append("stop_options.segment_id")

    migrations_run = len(applied_migrations)
    if migrations_run > 0:
        logger.info(
            f"Completed {migrations_run} migration(s): {', '.join(applied_migrations)}"
        )
    else:
        logger.info("No migrations needed")

    # Create/Update trip_summary view
    create_trip_summary_view(engine)


def create_trip_summary_view(engine: Engine) -> None:
    """Create or update the trip_summary database view."""
    view_sql = """
        CREATE VIEW trip_summary AS
        SELECT
            t.id,
            t.name,
            t.start_date,
            t.end_date,
            t.budget,
            COUNT(DISTINCT j.id)              AS journey_count,
            COUNT(DISTINCT td.id)             AS day_count,
            COALESCE(SUM(e.amount), 0)        AS total_spent,
            t.budget - COALESCE(SUM(e.amount), 0) AS budget_remaining
        FROM trips t
        LEFT JOIN journeys j    ON j.trip_id = t.id
        LEFT JOIN trip_days td  ON td.trip_id = t.id
        LEFT JOIN expenses e    ON e.trip_id = t.id
        GROUP BY t.id;
    """

    try:
        with engine.begin() as conn:
            # We use DROP VIEW IF EXISTS + CREATE VIEW to ensure the view is up to date
            # if the definition changes in the future.
            conn.execute(text("DROP VIEW IF EXISTS trip_summary"))
            conn.execute(text(view_sql))
        logger.info("Ensured trip_summary view exists")
    except Exception as e:
        logger.error(f"Failed to create trip_summary view: {type(e).__name__}: {e}")
