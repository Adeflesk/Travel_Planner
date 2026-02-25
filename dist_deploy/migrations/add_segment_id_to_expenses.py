"""
Database migration: Add segment_id FK to expenses table

Adds segment_id to expenses so transport costs can be linked directly to
a journey segment (Feature 022).

Usage:
    python migrations/add_segment_id_to_expenses.py
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
    """Check if a column already exists in a table."""
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    columns = [row[1] for row in result]
    return column in columns


def upgrade():
    """Add segment_id FK column to expenses table."""
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "expenses", "segment_id"):
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN segment_id INTEGER "
                    "REFERENCES journey_segments(id)"
                )
            )
            print("+ Added segment_id to expenses")
        else:
            print("= segment_id already exists on expenses")

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """SQLite does not support DROP COLUMN. For Postgres, run:
    ALTER TABLE expenses DROP COLUMN segment_id;
    """
    print(
        "Note: SQLite does not support DROP COLUMN.\n"
        "For Postgres, run:\n"
        "  ALTER TABLE expenses DROP COLUMN segment_id;"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Add segment_id FK to expenses table")
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Show rollback instructions",
    )

    args = parser.parse_args()

    try:
        if args.rollback:
            downgrade()
        else:
            upgrade()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
