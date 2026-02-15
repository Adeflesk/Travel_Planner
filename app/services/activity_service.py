"""
app/services/activity_service.py - Activity related services

Provides functions to compute trip progress and destinations-with-activities.

Author: Travel Planner Team
"""

from typing import Dict, List, Optional

from sqlalchemy.orm import Session, selectinload

from app import models


def get_trip_progress(trip_id: int, db: Session) -> Optional[Dict]:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    activities = (
        db.query(models.Activity)
        .join(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .all()
    )

    total = len(activities)
    completed = sum(1 for a in activities if a.is_completed)
    progress = round(completed / total * 100) if total > 0 else 0

    return {
        "total_activities": total,
        "completed_activities": completed,
        "progress_percent": progress,
    }


def get_destinations_with_activities(trip_id: int, db: Session) -> Optional[List[Dict]]:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    # Use selectinload to eagerly load activities (avoids N+1 queries)
    # This issues just 2 queries: one for destinations, one for all their activities
    destinations = (
        db.query(models.Destination)
        .options(selectinload(models.Destination.activities))
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    result = []
    for dest in destinations:
        # Sort activities in Python (already loaded via selectinload)
        sorted_activities = sorted(
            dest.activities,
            key=lambda a: (
                a.scheduled_date or "",
                a.scheduled_time or "",
            ),
        )
        result.append({"destination": dest, "activities": sorted_activities})

    return result
