"""
Database migration: Add user_settings table

Usage:
    python migrations/add_user_settings.py
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
        if not _table_exists(conn, "user_settings"):
            conn.execute(
                text(
                    """
                CREATE TABLE user_settings (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    default_currency TEXT    NOT NULL DEFAULT 'USD',
                    home_base        TEXT,
                    feature_flags    TEXT    NOT NULL DEFAULT '{}'
                )
            """
                )
            )
            print("+ Created user_settings")
        else:
            print("= user_settings already exists")

        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print("For Postgres:\n" "  DROP TABLE user_settings;")


if __name__ == "__main__":
    upgrade()
