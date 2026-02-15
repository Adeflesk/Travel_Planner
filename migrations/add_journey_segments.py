"""
Migration: Add journey_segments table for segment-based journeys.

Legacy alias for add_journey_segments_table.py to keep tooling consistent.
"""

from migrations.add_journey_segments_table import migrate_down, migrate_up

__all__ = ["migrate_up", "migrate_down"]
