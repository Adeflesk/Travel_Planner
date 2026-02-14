"""
Database migration: Add timezone support to journeys

This migration adds origin_timezone and destination_timezone columns to the journeys table
to support proper time zone handling for flights and other journeys.

Usage:
    python migrations/add_journey_timezones.py
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


def upgrade():
    """Add timezone columns to journeys table"""
    print("Adding timezone columns to journeys table...")
    engine = _get_engine()
    with engine.connect() as conn:
        # Add origin_timezone column
        conn.execute(
            text("ALTER TABLE journeys ADD COLUMN origin_timezone VARCHAR(50)")
        )
        print("✓ Added origin_timezone column")

        # Add destination_timezone column
        conn.execute(
            text("ALTER TABLE journeys ADD COLUMN destination_timezone VARCHAR(50)")
        )
        print("✓ Added destination_timezone column")

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """Remove timezone columns from journeys table"""
    print("Removing timezone columns from journeys table...")
    engine = _get_engine()
    with engine.connect() as conn:
        # Drop origin_timezone column
        conn.execute(text("ALTER TABLE journeys DROP COLUMN origin_timezone"))
        print("✓ Removed origin_timezone column")

        # Drop destination_timezone column
        conn.execute(text("ALTER TABLE journeys DROP COLUMN destination_timezone"))
        print("✓ Removed destination_timezone column")

        conn.commit()

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate journeys table to add timezone support"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration (remove timezone columns)",
    )

    args = parser.parse_args()

    try:
        if args.rollback:
            downgrade()
        else:
            upgrade()
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)
