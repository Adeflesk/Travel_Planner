"""
Optional backfill: Populate journey_segments from existing journey data.

This script is intentionally conservative and only creates a single segment
per journey when origin/destination data is available.
"""

import sqlite3


def migrate_up(db_path: str) -> None:
    """Backfill journey_segments with a simple segment per journey."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO journey_segments (
                journey_id,
                segment_type,
                origin_id,
                origin_name,
                destination_id,
                destination_name,
                start_datetime,
                end_datetime,
                origin_timezone,
                destination_timezone,
                metadata_json,
                "order"
            )
            SELECT
                id,
                CASE
                    WHEN transport_mode IS NULL THEN 'TRANSFER'
                    ELSE UPPER(transport_mode)
                END,
                origin_id,
                origin_name,
                destination_id,
                destination_name,
                departure_datetime,
                arrival_datetime,
                origin_timezone,
                destination_timezone,
                NULL,
                0
            FROM journeys
            WHERE id NOT IN (
                SELECT journey_id FROM journey_segments
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def migrate_down(db_path: str) -> None:
    """No-op for backfill rollback."""
    _ = db_path


if __name__ == "__main__":
    import os
    import sys

    default_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "travel_planner.db",
    )
    db_path = sys.argv[1] if len(sys.argv) > 1 else default_path

    migrate_up(db_path)
