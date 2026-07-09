"""
migrations/backfill_waypoints.py - Convert legacy waypoints text to TransportStop rows.

Idempotent: skips any transport that already has stops. Safe to call
from ``run_migrations()`` on every startup.

Author: Travel Planner Team
"""

import logging

from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def backfill_waypoints(engine: Engine) -> None:
    """Convert free-text ``TripTransport.waypoints`` into ``TransportStop`` rows.

    For each transport with non-empty waypoints AND no existing stops:
    - Split waypoints by newline
    - Create one ``TransportStop`` per non-empty line
    - Set ``category = 'other'``, leave durations/drive times NULL (user fills in)
    - Increment ``sort_order`` for chain ordering

    The legacy ``waypoints`` column is NOT cleared — it stays until the
    frontend release that stops reading it.
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # Guard: both tables must exist
    if "trip_transports" not in existing_tables:
        return
    if "transport_stops" not in existing_tables:
        return

    with engine.connect() as conn:
        # Find transports with waypoints text that have NO stops yet
        rows = conn.execute(
            text(
                """
                SELECT t.id, t.waypoints
                FROM trip_transports t
                WHERE t.waypoints IS NOT NULL
                  AND t.waypoints != ''
                  AND NOT EXISTS (
                      SELECT 1 FROM transport_stops s
                      WHERE s.transport_id = t.id
                  )
                """
            )
        ).fetchall()

        if not rows:
            logger.info("Waypoint backfill: nothing to migrate")
            return

        total_stops = 0
        for transport_id, waypoints_text in rows:
            lines = [
                line.strip() for line in waypoints_text.split("\n") if line.strip()
            ]
            for sort_order, name in enumerate(lines):
                conn.execute(
                    text(
                        """
                        INSERT INTO transport_stops
                            (transport_id, name, category, sort_order,
                             requires_daylight)
                        VALUES
                            (:transport_id, :name, 'other', :sort_order, 0)
                        """
                    ),
                    {
                        "transport_id": transport_id,
                        "name": name,
                        "sort_order": sort_order,
                    },
                )
                total_stops += 1

        conn.commit()
        logger.info(
            f"Waypoint backfill: created {total_stops} stops "
            f"from {len(rows)} transport(s)"
        )
