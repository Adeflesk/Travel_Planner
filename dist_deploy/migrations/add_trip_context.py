"""
Database migration: Add context JSON column to trips table

Usage:
    python migrations/add_trip_context.py
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


def _column_exists(conn, table, column):
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "trips", "context"):
            conn.execute(text("ALTER TABLE trips ADD COLUMN context TEXT"))
            print("+ Added context to trips")
        else:
            print("= context already exists on trips")
        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print(
        "SQLite: DROP COLUMN not supported. For Postgres:\n"
        "  ALTER TABLE trips DROP COLUMN context;"
    )


if __name__ == "__main__":
    upgrade()
