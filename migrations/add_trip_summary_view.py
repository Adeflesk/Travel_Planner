"""
Database migration: Add trip_summary view

Usage:
    python migrations/add_trip_summary_view.py
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


def _view_exists(conn, view):
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='view' AND name=:name"),
        {"name": view},
    )
    return result.fetchone() is not None


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _view_exists(conn, "trip_summary"):
            conn.execute(
                text(
                    """
                CREATE VIEW trip_summary AS
                SELECT
                    t.id,
                    t.name,
                    t.start_date,
                    t.end_date,
                    t.budget,
                    COUNT(DISTINCT j.id)              AS journey_count,
                    COUNT(DISTINCT td.id)             AS day_count,
                    COALESCE(SUM(e.amount), 0)        AS total_spent,
                    t.budget - COALESCE(SUM(e.amount), 0) AS budget_remaining
                FROM trips t
                LEFT JOIN journeys j    ON j.trip_id = t.id
                LEFT JOIN trip_days td  ON td.trip_id = t.id
                LEFT JOIN expenses e    ON e.trip_id = t.id
                GROUP BY t.id;
            """
                )
            )
            print("+ Created trip_summary view")
        else:
            print("= trip_summary view already exists")

        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print("For Postgres / SQLite:\n" "  DROP VIEW trip_summary;")


if __name__ == "__main__":
    upgrade()
