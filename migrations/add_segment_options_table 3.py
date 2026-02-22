"""
Database migration: Add segment_options table

This migration creates the segment_options table to store alternative
transport options for journey segments (e.g., comparing Uber vs taxi vs shuttle).

Usage:
    python migrations/add_segment_options_table.py
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
    """Create segment_options table."""
    print("Creating segment_options table...")
    engine = _get_engine()
    with engine.connect() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS segment_options (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    segment_id INTEGER NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    provider VARCHAR(100),
                    frequency VARCHAR(100),
                    estimated_duration INTEGER,
                    cost DECIMAL(10, 2),
                    currency VARCHAR(3) DEFAULT 'USD',
                    booking_url VARCHAR(500),
                    notes TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'researching',
                    "order" INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (segment_id) REFERENCES journey_segments(id) ON DELETE CASCADE
                )
                """
            )
        )
        print("✓ Created segment_options table")

        conn.commit()

    print("Migration completed successfully!")


def downgrade():
    """Drop segment_options table."""
    print("Dropping segment_options table...")
    engine = _get_engine()
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS segment_options"))
        print("✓ Dropped segment_options table")

        conn.commit()

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate journey segments to add segment options support"
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration (drop segment_options table)",
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
