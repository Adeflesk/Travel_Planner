#!/usr/bin/env python
"""
Migration: Create rate_snapshots table for exchange rate history tracking.
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

    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "rate_snapshots" in tables:
            print("Table rate_snapshots already exists — skipping.")
            return

        if engine.dialect.name == "sqlite":
            conn.execute(
                text(
                    """
                    CREATE TABLE rate_snapshots (
                        id INTEGER PRIMARY KEY,
                        base_currency VARCHAR(3) NOT NULL,
                        target_currency VARCHAR(3) NOT NULL,
                        rate NUMERIC(12, 6) NOT NULL,
                        fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )
            )
        else:
            conn.execute(
                text(
                    """
                    CREATE TABLE rate_snapshots (
                        id SERIAL PRIMARY KEY,
                        base_currency VARCHAR(3) NOT NULL,
                        target_currency VARCHAR(3) NOT NULL,
                        rate NUMERIC(12, 6) NOT NULL,
                        fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                """
                )
            )

        conn.execute(
            text(
                "CREATE INDEX ix_rate_snapshots_base ON rate_snapshots (base_currency)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX ix_rate_snapshots_target ON rate_snapshots (target_currency)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX ix_rate_snapshots_fetched ON rate_snapshots (fetched_at)"
            )
        )
        conn.commit()
        print("Created rate_snapshots table with indexes.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
