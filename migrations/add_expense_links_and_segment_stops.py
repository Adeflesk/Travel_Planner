"""
Database migration: Add expense links and segment-based stop options

Adds:
- segment_option_id FK to expenses table
- stop_option_id FK to expenses table
- segment_id FK to stop_options table (allows stop options on segments)

Usage:
    python migrations/add_expense_links_and_segment_stops.py
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
    """Add new FK columns to expenses and stop_options tables."""
    engine = _get_engine()
    with engine.connect() as conn:
        # Add segment_option_id to expenses
        if not _column_exists(conn, "expenses", "segment_option_id"):
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN segment_option_id INTEGER "
                    "REFERENCES segment_options(id)"
                )
            )
            print("+ Added segment_option_id to expenses")
        else:
            print("= segment_option_id already exists on expenses")

        # Add stop_option_id to expenses
        if not _column_exists(conn, "expenses", "stop_option_id"):
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN stop_option_id INTEGER "
                    "REFERENCES stop_options(id)"
                )
            )
            print("+ Added stop_option_id to expenses")
        else:
            print("= stop_option_id already exists on expenses")

        # Add segment_id to stop_options
        if not _column_exists(conn, "stop_options", "segment_id"):
            conn.execute(
                text(
                    "ALTER TABLE stop_options ADD COLUMN segment_id INTEGER "
                    "REFERENCES journey_segments(id)"
                )
            )
            print("+ Added segment_id to stop_options")
        else:
            print("= segment_id already exists on stop_options")

        # Make stop_id nullable on stop_options (SQLite doesn't support ALTER COLUMN,
        # but the column is already nullable in practice since SQLite doesn't enforce
        # NOT NULL on ALTER TABLE ADD COLUMN. The model change handles new records.)

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """SQLite doesn't support DROP COLUMN easily. Documented for Postgres."""
    print(
        "Note: SQLite does not support DROP COLUMN. "
        "For Postgres, run:\n"
        "  ALTER TABLE expenses DROP COLUMN segment_option_id;\n"
        "  ALTER TABLE expenses DROP COLUMN stop_option_id;\n"
        "  ALTER TABLE stop_options DROP COLUMN segment_id;"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Add expense links and segment-based stop options"
    )
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
