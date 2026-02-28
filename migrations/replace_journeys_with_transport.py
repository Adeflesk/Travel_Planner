#!/usr/bin/env python
"""
Migration: Replace journeys system with TripTransport.

Drops all journey/segment/stop tables and removes journey-related FK columns
from the expenses table.

NOTE: This migration is irreversible. Back up your database before running.
NOTE: SQLite does not support DROP COLUMN — expense FK cleanup is Postgres-only.
      The SQLAlchemy models have already been updated, so the old columns are
      simply ignored on SQLite databases.
"""
import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import text, inspect  # noqa: E402


def _get_engine():
    from database import engine

    return engine


TABLES_TO_DROP = [
    "segment_expenses",
    "activity_expenses",  # keep if activities still use this — see note below
    "stop_options",
    "segment_options",
    "journey_stops",
    "journey_segments",
    "journey_documents",
    "journeys",
]

EXPENSE_COLUMNS_TO_DROP = ["segment_id", "segment_option_id", "stop_option_id"]


def upgrade():
    engine = _get_engine()
    dialect = engine.dialect.name  # "sqlite" or "postgresql"

    with engine.connect() as conn:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        # Drop old journey-related tables
        for table in TABLES_TO_DROP:
            if table == "activity_expenses":
                # Keep activity_expenses — it links expenses to day activities
                continue
            if table in existing_tables:
                print(f"  Dropping table: {table}")
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
            else:
                print(f"  Skipping (not found): {table}")

        # Remove old FK columns from expenses (Postgres only)
        if dialect == "postgresql":
            expense_cols = {col["name"] for col in inspector.get_columns("expenses")}
            for col in EXPENSE_COLUMNS_TO_DROP:
                if col in expense_cols:
                    print(f"  Dropping column expenses.{col}")
                    conn.execute(
                        text(f"ALTER TABLE expenses DROP COLUMN IF EXISTS {col}")
                    )
                else:
                    print(f"  Column expenses.{col} already gone, skipping")
        else:
            print(
                "  SQLite: skipping expense column removal "
                "(columns remain but are ignored by SQLAlchemy)"
            )

        conn.commit()

    print("✓ Migration complete: journeys system removed")


def downgrade():
    print("This migration is irreversible. Restore from a database backup to undo.")


if __name__ == "__main__":
    upgrade()
