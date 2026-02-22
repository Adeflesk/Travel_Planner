"""
Database migration: Add timezone support to trips and destinations

This migration adds timezone columns to trips and destinations to support
prefill defaults for journeys and segments.

Usage:
    python migrations/add_trip_destination_timezones.py
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
    """Add timezone columns to trips and destinations tables."""
    print("Adding timezone columns to trips and destinations tables...")
    engine = _get_engine()
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE trips ADD COLUMN timezone VARCHAR(50)"))
        print("✓ Added trips.timezone column")

        conn.execute(text("ALTER TABLE destinations ADD COLUMN timezone VARCHAR(50)"))
        print("✓ Added destinations.timezone column")

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """Remove timezone columns from trips and destinations tables."""
    print("Removing timezone columns from trips and destinations tables...")
    engine = _get_engine()
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE trips DROP COLUMN timezone"))
        print("✓ Removed trips.timezone column")

        conn.execute(text("ALTER TABLE destinations DROP COLUMN timezone"))
        print("✓ Removed destinations.timezone column")

        conn.commit()

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate trips and destinations to add timezone support"
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
