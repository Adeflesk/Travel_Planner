"""
Migration: Add journey_segments table for segment-based journeys.

SQLite-friendly migration that creates the journey_segments table and indexes.
"""

import sqlite3


def migrate_up(db_path: str) -> None:
    """Create the journey_segments table and indexes."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS journey_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
                segment_type VARCHAR(20) NOT NULL,
                origin_id INTEGER REFERENCES destinations(id),
                origin_name VARCHAR(200),
                destination_id INTEGER REFERENCES destinations(id),
                destination_name VARCHAR(200),
                start_datetime DATETIME,
                end_datetime DATETIME,
                origin_timezone VARCHAR(50),
                destination_timezone VARCHAR(50),
                metadata_json TEXT,
                "order" INTEGER DEFAULT 0 NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_journey_segments_journey_id
            ON journey_segments (journey_id)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_journey_segments_order
            ON journey_segments (journey_id, "order")
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_journey_segments_type
            ON journey_segments (segment_type)
            """
        )
        conn.commit()
    finally:
        conn.close()


def migrate_down(db_path: str) -> None:
    """Drop the journey_segments table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("DROP TABLE IF EXISTS journey_segments")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    import os
    import sys

    default_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "travel_planner.db",
    )
    db_path = sys.argv[1] if len(sys.argv) > 1 else default_path

    if len(sys.argv) > 2 and sys.argv[2] == "down":
        migrate_down(db_path)
    else:
        migrate_up(db_path)
