"""
Database migration: Add transport_id FK to expenses

Adds a nullable `transport_id` column to the `expenses` table so that
auto-synced transport expenses can be looked up and updated without
relying on description-matching heuristics.

Usage:
    python migrations/add_transport_id_to_expenses.py
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
    result = conn.execute(
        text("SELECT name FROM pragma_table_info(:table) WHERE name=:col"),
        {"table": table, "col": column},
    )
    return result.fetchone() is not None


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if _column_exists(conn, "expenses", "transport_id"):
            print("= transport_id already exists on expenses — skipping")
        else:
            conn.execute(
                text(
                    """
                    ALTER TABLE expenses
                    ADD COLUMN transport_id INTEGER
                    REFERENCES trip_transports(id) ON DELETE SET NULL
                    """
                )
            )
            conn.commit()
            print("+ Added transport_id to expenses")
    print("Migration completed successfully!")


def downgrade():
    print(
        "SQLite does not support DROP COLUMN directly.\n"
        "For PostgreSQL: ALTER TABLE expenses DROP COLUMN transport_id;"
    )


if __name__ == "__main__":
    upgrade()
