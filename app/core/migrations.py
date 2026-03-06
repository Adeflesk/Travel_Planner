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


def migrate_unified_activities(engine: Engine) -> None:
    """Migrate to unified activities schema.

    - Drops the legacy `activities` table if it exists.
    - Rebuilds `day_activities` with a `destination_id` column if that column
      is not yet present (SQLite does not support ADD COLUMN with FK references,
      so a table-rebuild is required).
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    activities_exists = "activities" in existing_tables
    day_activities_exists = "day_activities" in existing_tables

    # Check whether destination_id is already present BEFORE opening the
    # transaction (inspector cannot be used inside engine.begin()).
    # destination_id is the sentinel: SQLite can't ADD COLUMN with FK, so absence means rebuild needed.
    needs_rebuild = False
    if day_activities_exists:
        day_activity_columns = {
            col["name"] for col in inspector.get_columns("day_activities")
        }
        needs_rebuild = "destination_id" not in day_activity_columns

    with engine.begin() as conn:
        if activities_exists:
            conn.execute(text("DROP TABLE IF EXISTS activities CASCADE"))
            logger.info("Dropped legacy activities table")

        if day_activities_exists and needs_rebuild:
            conn.execute(
                text(
                    """
                CREATE TABLE day_activities_new (
                    id INTEGER PRIMARY KEY,
                    day_id INTEGER REFERENCES trip_days(id) ON DELETE CASCADE,
                    destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
                    start_time VARCHAR(5),
                    end_time VARCHAR(5),
                    title TEXT NOT NULL,
                    category VARCHAR(32),
                    location TEXT,
                    notes TEXT,
                    cost FLOAT,
                    currency VARCHAR(3),
                    booked BOOLEAN NOT NULL DEFAULT FALSE,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    is_todo BOOLEAN NOT NULL DEFAULT FALSE,
                    is_completed BOOLEAN NOT NULL DEFAULT FALSE
                )
            """
                )
            )
            conn.execute(
                text(
                    """
                INSERT INTO day_activities_new (
                    id, day_id, start_time, end_time, title, category,
                    location, notes, cost, currency, booked, sort_order,
                    is_todo, is_completed
                )
                SELECT
                    id, day_id, start_time, end_time, title, category,
                    location, notes, cost, currency, booked, sort_order,
                    FALSE, FALSE
                FROM day_activities
            """
                )
            )
            conn.execute(text("DROP TABLE IF EXISTS day_activities"))
            conn.execute(
                text("ALTER TABLE day_activities_new RENAME TO day_activities")
            )
            logger.info("Migrated day_activities to unified schema")


def fix_day_activities_id_sequence(engine: Engine) -> None:
    """Fix missing autoincrement sequence on day_activities.id for Postgres.

    When migrate_unified_activities rebuilt the table it used raw SQL with
    'id INTEGER PRIMARY KEY'. In SQLite that implies autoincrement; in Postgres
    it does not — so INSERTs fail with NotNullViolation on the id column.
    This migration detects the missing sequence and attaches one.
    """
    if engine.dialect.name != "postgresql":
        return

    try:
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT column_default
                    FROM information_schema.columns
                    WHERE table_name = 'day_activities' AND column_name = 'id'
                    """
                )
            ).fetchone()

            if row is None or row[0] is not None:
                # Table doesn't exist yet, or sequence already attached
                return

            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS day_activities_id_seq"))
            conn.execute(
                text(
                    "SELECT setval('day_activities_id_seq',"
                    " COALESCE((SELECT MAX(id) FROM day_activities), 0) + 1, false)"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE day_activities"
                    " ALTER COLUMN id SET DEFAULT nextval('day_activities_id_seq')"
                )
            )
            conn.commit()
            logger.info("Fixed day_activities.id sequence for Postgres")
    except Exception as e:
        logger.warning(f"Could not fix day_activities id sequence: {e}")


def run_migrations(engine: Engine) -> None:
    """Run all pending migrations."""
    logger.info("Running database migrations...")

    trip_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
        ("context", "TEXT", "NULL"),
        ("default_currency", "VARCHAR(10)", "NULL"),
    ]

    destination_columns = [
        ("timezone", "VARCHAR(50)", "NULL"),
        ("latitude", "FLOAT", "NULL"),
        ("longitude", "FLOAT", "NULL"),
    ]

    trip_day_columns = [
        ("destination_id", "INTEGER", "NULL"),
    ]

    trip_transport_columns = [
        ("origin_latitude", "FLOAT", "NULL"),
        ("origin_longitude", "FLOAT", "NULL"),
        ("destination_latitude", "FLOAT", "NULL"),
        ("destination_longitude", "FLOAT", "NULL"),
    ]

    day_activity_columns = [
        ("latitude", "FLOAT", "NULL"),
        ("longitude", "FLOAT", "NULL"),
    ]

    expense_columns = [
        ("transport_id", "INTEGER", "NULL"),
        ("accommodation_id", "INTEGER", "NULL"),
    ]

    applied_migrations: list[str] = []

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

    for col_name, col_type, default in trip_day_columns:
        if add_column_if_not_exists(engine, "trip_days", col_name, col_type, default):
            if col_name == "destination_id":
                # SQLite ADD COLUMN supports nullable FKs without special handling
                pass
            applied_migrations.append(f"trip_days.{col_name}")

    for col_name, col_type, default in trip_transport_columns:
        if add_column_if_not_exists(
            engine, "trip_transports", col_name, col_type, default
        ):
            applied_migrations.append(f"trip_transports.{col_name}")

    for col_name, col_type, default in day_activity_columns:
        if add_column_if_not_exists(
            engine, "day_activities", col_name, col_type, default
        ):
            applied_migrations.append(f"day_activities.{col_name}")

    for col_name, col_type, default in expense_columns:
        if add_column_if_not_exists(engine, "expenses", col_name, col_type, default):
            applied_migrations.append(f"expenses.{col_name}")

    migrations_run = len(applied_migrations)
    if migrations_run > 0:
        logger.info(
            f"Completed {migrations_run} migration(s): {', '.join(applied_migrations)}"
        )
    else:
        logger.info("No migrations needed")

    migrate_unified_activities(engine)

    fix_day_activities_id_sequence(engine)

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
            COUNT(DISTINCT td.id)             AS day_count,
            COALESCE(SUM(e.amount), 0)        AS total_spent,
            t.budget - COALESCE(SUM(e.amount), 0) AS budget_remaining
        FROM trips t
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
