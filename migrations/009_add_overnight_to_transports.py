"""Add overnight column to trip_transports."""

import os
import sys
from sqlalchemy import text


def _get_engine():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.append(project_root)
    from database import engine

    return engine


def upgrade() -> None:
    engine = _get_engine()
    with engine.connect() as conn:
        conn.execute(
            text(
                "ALTER TABLE trip_transports ADD COLUMN overnight BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        conn.commit()


if __name__ == "__main__":
    upgrade()
    print("Migration 009: overnight column added.")
