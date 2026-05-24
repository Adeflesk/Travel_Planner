"""
Database migration: Add check_in_time and check_out_time to accommodations

Stores times as VARCHAR(5) "HH:MM" — same pattern as trip_transports.departure_time.

Usage:
    python migrations/add_accommodation_times.py
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
    if conn.engine.dialect.name == "postgresql":
        result = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ),
            {"t": table, "c": column},
        )
        return result.fetchone() is not None
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade() -> None:
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "accommodations", "check_in_time"):
            conn.execute(
                text("ALTER TABLE accommodations ADD COLUMN check_in_time VARCHAR(5)")
            )
            conn.commit()
            print("+ Added check_in_time to accommodations")
        else:
            print("= check_in_time already exists — skipping")

        if not _column_exists(conn, "accommodations", "check_out_time"):
            conn.execute(
                text("ALTER TABLE accommodations ADD COLUMN check_out_time VARCHAR(5)")
            )
            conn.commit()
            print("+ Added check_out_time to accommodations")
        else:
            print("= check_out_time already exists — skipping")

    print("Migration completed successfully!")


def downgrade() -> None:
    print(
        "SQLite: DROP COLUMN not supported — recreate accommodations without time columns.\n"
        "PostgreSQL: ALTER TABLE accommodations DROP COLUMN check_in_time; "
        "ALTER TABLE accommodations DROP COLUMN check_out_time;"
    )


if __name__ == "__main__":
    upgrade()
