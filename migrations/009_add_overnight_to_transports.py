"""
Database migration: Add overnight column to trip_transports

Usage:
    python migrations/009_add_overnight_to_transports.py
"""

import os
import sys
from sqlalchemy import text


def _get_engine():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.append(project_root)
    from database import engine

    return engine


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade() -> None:
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "trip_transports", "overnight"):
            conn.execute(
                text(
                    "ALTER TABLE trip_transports ADD COLUMN overnight BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )
            conn.commit()


def downgrade() -> None:
    print(
        "SQLite: DROP COLUMN not supported in older versions. For Postgres:\n"
        "  ALTER TABLE trip_transports DROP COLUMN overnight;"
    )


if __name__ == "__main__":
    upgrade()
    print("Migration 009: overnight column added.")
