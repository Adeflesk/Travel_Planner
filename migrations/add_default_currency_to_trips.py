#!/usr/bin/env python
"""
Migration: Add default_currency column to trips table.

Backfills from context->budget_currency for existing rows.
Safe to run multiple times (checks column existence first).
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


def upgrade():
    engine = _get_engine()
    dialect = engine.dialect.name  # "sqlite" or "postgresql"

    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("trips")]

        if "default_currency" not in columns:
            conn.execute(
                text("ALTER TABLE trips ADD COLUMN default_currency VARCHAR(10)")
            )
            conn.commit()
            print("Added default_currency column to trips.")
        else:
            print("Column default_currency already exists — skipping.")

        # Backfill from context JSON blob for SQLite
        if dialect == "sqlite":
            conn.execute(
                text(
                    """
                UPDATE trips
                SET default_currency = json_extract(context, '$.budget_currency')
                WHERE default_currency IS NULL
                  AND context IS NOT NULL
                  AND json_extract(context, '$.budget_currency') IS NOT NULL
            """
                )
            )
        else:
            # PostgreSQL: context is a jsonb column
            conn.execute(
                text(
                    """
                UPDATE trips
                SET default_currency = context->>'budget_currency'
                WHERE default_currency IS NULL
                  AND context IS NOT NULL
                  AND context->>'budget_currency' IS NOT NULL
            """
                )
            )
        conn.commit()
        print("Backfilled default_currency from context.budget_currency.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
