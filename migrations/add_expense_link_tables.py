"""
Database migration: Add expense link tables

Adds:
- segment_expenses (segment_id, expense_id)
- activity_expenses (activity_id, expense_id)

The old nullable FK columns on expenses are preserved for backwards compatibility.
New application code writes to the link tables; old data is untouched.

Usage:
    python migrations/add_expense_link_tables.py
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


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _table_exists(conn, "segment_expenses"):
            conn.execute(
                text(
                    """
                CREATE TABLE segment_expenses (
                    segment_id INTEGER NOT NULL REFERENCES journey_segments(id) ON DELETE CASCADE,
                    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    PRIMARY KEY (segment_id, expense_id)
                )
            """
                )
            )
            print("+ Created segment_expenses")
        else:
            print("= segment_expenses already exists")

        if not _table_exists(conn, "activity_expenses"):
            conn.execute(
                text(
                    """
                CREATE TABLE activity_expenses (
                    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
                    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    PRIMARY KEY (activity_id, expense_id)
                )
            """
                )
            )
            print("+ Created activity_expenses")
        else:
            print("= activity_expenses already exists")

        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print(
        "For Postgres:\n"
        "  DROP TABLE segment_expenses;\n"
        "  DROP TABLE activity_expenses;"
    )


if __name__ == "__main__":
    upgrade()
