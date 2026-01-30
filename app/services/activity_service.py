"""
app/services/activity_service.py - Activity related services

Provides functions to compute trip progress and destinations-with-activities.

Author: Travel Planner Team
"""

from typing import List, Dict
from sqlalchemy.orm import Session
import models


def get_trip_progress(trip_id: int, db: Session) -> Dict:
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


def get_destinations_with_activities(trip_id: int, db: Session) -> List[Dict]:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    result = []
    for dest in destinations:
        activities = (
            db.query(models.Activity)
            .filter(models.Activity.destination_id == dest.id)
            .order_by(models.Activity.scheduled_date, models.Activity.scheduled_time)
            .all()
        )
        result.append({"destination": dest, "activities": activities})

    return result
