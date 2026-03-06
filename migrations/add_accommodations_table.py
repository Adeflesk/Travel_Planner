"""
Database migration: Create accommodations table and add accommodation_id to expenses

Creates the accommodations table and adds accommodation_id FK to expenses,
following the same pattern as transport_id on expenses.

Usage:
    python migrations/add_accommodations_table.py
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
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:table"),
        {"table": table},
    )
    return result.fetchone() is not None


def _column_exists(conn, table, column):
    result = conn.execute(
        text("SELECT name FROM pragma_table_info(:table) WHERE name=:col"),
        {"table": table, "col": column},
    )
    return result.fetchone() is not None


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if _table_exists(conn, "accommodations"):
            print("= accommodations table already exists — skipping")
        else:
            conn.execute(
                text(
                    """
                CREATE TABLE accommodations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    destination_id INTEGER NOT NULL
                        REFERENCES destinations(id) ON DELETE CASCADE,
                    trip_id INTEGER NOT NULL
                        REFERENCES trips(id) ON DELETE CASCADE,
                    name VARCHAR(200) NOT NULL,
                    address TEXT,
                    check_in_date DATE NOT NULL,
                    check_out_date DATE NOT NULL,
                    cost REAL,
                    currency VARCHAR(10),
                    confirmation_number VARCHAR(200),
                    booking_url TEXT,
                    contact_phone VARCHAR(50),
                    cancellation_policy TEXT,
                    cancel_by_date DATE,
                    booked BOOLEAN NOT NULL DEFAULT FALSE,
                    paid BOOLEAN NOT NULL DEFAULT FALSE,
                    notes TEXT
                )
            """
                )
            )
            conn.commit()
            print("+ Created accommodations table")

        if _column_exists(conn, "expenses", "accommodation_id"):
            print("= accommodation_id already exists on expenses — skipping")
        else:
            conn.execute(
                text(
                    """
                    ALTER TABLE expenses
                    ADD COLUMN accommodation_id INTEGER
                    REFERENCES accommodations(id) ON DELETE SET NULL
                    """
                )
            )
            conn.commit()
            print("+ Added accommodation_id to expenses")

    print("Migration completed successfully!")


def downgrade():
    print(
        "SQLite: DROP TABLE accommodations;\n"
        "SQLite does not support DROP COLUMN — recreate expenses table without accommodation_id.\n"
        "PostgreSQL: ALTER TABLE expenses DROP COLUMN accommodation_id; DROP TABLE accommodations CASCADE;"
    )


if __name__ == "__main__":
    upgrade()
