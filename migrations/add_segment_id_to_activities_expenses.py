"""
Database migration: Add segment_id to activities and expenses tables

This migration adds segment_id foreign key columns to activities and expenses
tables to support the polymorphic linking pattern for journey segments.
Also makes activities.destination_id nullable to support transit-only activities.

Usage:
    python migrations/add_segment_id_to_activities_expenses.py
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
    """Add segment_id columns to activities and expenses tables."""
    print("Adding segment_id columns and updating constraints...")
    engine = _get_engine()

    with engine.connect() as conn:
        # Check if we're using SQLite or PostgreSQL
        result = conn.execute(text("SELECT sqlite_version()")).fetchone()
        is_sqlite = result is not None

        if is_sqlite:
            print("Detected SQLite - using SQLite-specific migration")
            # SQLite doesn't support ALTER TABLE to modify constraints directly
            # We'll just add the column - the application will enforce validation

            # Add segment_id to activities table
            conn.execute(
                text(
                    "ALTER TABLE activities ADD COLUMN segment_id INTEGER REFERENCES journey_segments(id)"
                )
            )
            print("✓ Added activities.segment_id column")

            # Make activities.destination_id nullable is tricky in SQLite
            # We need to recreate the table
            print(
                "⚠ SQLite doesn't support ALTER COLUMN - activities.destination_id constraint will be managed by application"
            )

            # Add segment_id to expenses table
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN segment_id INTEGER REFERENCES journey_segments(id)"
                )
            )
            print("✓ Added expenses.segment_id column")

        else:
            # PostgreSQL
            print("Detected PostgreSQL - using PostgreSQL-specific migration")

            # Add segment_id to activities table
            conn.execute(
                text(
                    """
                    ALTER TABLE activities
                    ADD COLUMN segment_id INTEGER REFERENCES journey_segments(id)
                """
                )
            )
            print("✓ Added activities.segment_id column")

            # Make activities.destination_id nullable
            conn.execute(
                text("ALTER TABLE activities ALTER COLUMN destination_id DROP NOT NULL")
            )
            print("✓ Made activities.destination_id nullable")

            # Add segment_id to expenses table
            conn.execute(
                text(
                    """
                    ALTER TABLE expenses
                    ADD COLUMN segment_id INTEGER REFERENCES journey_segments(id)
                """
                )
            )
            print("✓ Added expenses.segment_id column")

            # Add check constraint to ensure at least one link exists
            conn.execute(
                text(
                    """
                    ALTER TABLE activities
                    ADD CONSTRAINT activities_link_check
                    CHECK (destination_id IS NOT NULL OR segment_id IS NOT NULL)
                """
                )
            )
            print("✓ Added activities link validation constraint")

            conn.execute(
                text(
                    """
                    ALTER TABLE expenses
                    ADD CONSTRAINT expenses_link_check
                    CHECK (destination_id IS NOT NULL OR activity_id IS NOT NULL OR segment_id IS NOT NULL)
                """
                )
            )
            print("✓ Added expenses link validation constraint")

        # Create indexes for better query performance
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_activities_segment_id ON activities(segment_id)"
            )
        )
        print("✓ Created index on activities.segment_id")

        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_expenses_segment_id ON expenses(segment_id)"
            )
        )
        print("✓ Created index on expenses.segment_id")

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """Remove segment_id columns from activities and expenses tables."""
    print("Removing segment_id columns and constraints...")
    engine = _get_engine()

    with engine.connect() as conn:
        # Check if we're using SQLite or PostgreSQL
        result = conn.execute(text("SELECT sqlite_version()")).fetchone()
        is_sqlite = result is not None

        if is_sqlite:
            print("⚠ SQLite doesn't support DROP COLUMN easily")
            print("Please manually drop the columns or recreate the tables")
            print("Skipping rollback for SQLite")
        else:
            # PostgreSQL
            # Drop constraints first
            conn.execute(
                text(
                    "ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_link_check"
                )
            )
            print("✓ Removed activities link validation constraint")

            conn.execute(
                text(
                    "ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_link_check"
                )
            )
            print("✓ Removed expenses link validation constraint")

            # Drop segment_id columns
            conn.execute(text("ALTER TABLE activities DROP COLUMN segment_id"))
            print("✓ Removed activities.segment_id column")

            conn.execute(text("ALTER TABLE expenses DROP COLUMN segment_id"))
            print("✓ Removed expenses.segment_id column")

            # Make activities.destination_id NOT NULL again
            conn.execute(
                text("ALTER TABLE activities ALTER COLUMN destination_id SET NOT NULL")
            )
            print("✓ Made activities.destination_id NOT NULL again")

        conn.commit()

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate activities and expenses to support journey segments"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration (remove segment_id columns)",
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
