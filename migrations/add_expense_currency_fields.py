#!/usr/bin/env python
"""
Migration: Add exchange_rate and base_amount columns to expenses table.

Backfills existing rows with exchange_rate=1.0 and base_amount=amount
(assumes all existing expenses are in the trip's base currency).
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
        columns = [c["name"] for c in inspector.get_columns("expenses")]

        if "exchange_rate" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN exchange_rate NUMERIC(12, 6) DEFAULT 1.0"
                )
            )
            conn.commit()
            print("Added exchange_rate column to expenses.")
        else:
            print("Column exchange_rate already exists — skipping.")

        if "base_amount" not in columns:
            conn.execute(
                text("ALTER TABLE expenses ADD COLUMN base_amount NUMERIC(10, 2)")
            )
            conn.commit()
            print("Added base_amount column to expenses.")
        else:
            print("Column base_amount already exists — skipping.")

        # Backfill: set base_amount = amount for all existing rows where null
        conn.execute(
            text(
                """
                UPDATE expenses
                SET base_amount = amount,
                    exchange_rate = 1.0
                WHERE base_amount IS NULL
            """
            )
        )
        conn.commit()
        print("Backfilled base_amount = amount for existing expenses.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
