"""
Database migration: Add trip_days and day_activities tables, and update journeys

Usage:
    python migrations/add_trip_days.py
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


def _table_exists(conn, table):
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table},
    )
    return result.fetchone() is not None


def _column_exists(conn, table, column):
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _table_exists(conn, "trip_days"):
            conn.execute(
                text(
                    """
                CREATE TABLE trip_days (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    trip_id     INTEGER  NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                    date        DATE     NOT NULL,
                    title       TEXT,
                    location    TEXT,
                    notes       TEXT,
                    sort_order  INTEGER  NOT NULL DEFAULT 0,
                    UNIQUE(trip_id, date)
                )
            """
                )
            )
            print("+ Created trip_days")
        else:
            print("= trip_days already exists")

        if not _table_exists(conn, "day_activities"):
            conn.execute(
                text(
                    """
                CREATE TABLE day_activities (
                    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
                    day_id       INTEGER  NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
                    start_time   TEXT     NOT NULL,
                    end_time     TEXT,
                    title        TEXT     NOT NULL,
                    category     TEXT,
                    location     TEXT,
                    notes        TEXT,
                    cost         REAL,
                    currency     TEXT,
                    booked       INTEGER  NOT NULL DEFAULT 0,
                    sort_order   INTEGER  NOT NULL DEFAULT 0
                )
            """
                )
            )
            print("+ Created day_activities")
        else:
            print("= day_activities already exists")

        if not _column_exists(conn, "journeys", "day_id"):
            conn.execute(
                text(
                    "ALTER TABLE journeys ADD COLUMN day_id INTEGER REFERENCES trip_days(id)"
                )
            )
            print("+ Added day_id to journeys")
        else:
            print("= day_id already exists on journeys")

        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print(
        "For Postgres:\n"
        "  ALTER TABLE journeys DROP COLUMN day_id;\n"
        "  DROP TABLE day_activities;\n"
        "  DROP TABLE trip_days;"
    )


if __name__ == "__main__":
    upgrade()
