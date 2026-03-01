"""
app/services/activity_service.py - Activity services

All functions now operate on the unified DayActivity model.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app import models


def get_trip_progress(trip_id: int, db: Session) -> Optional[dict]:
    """Compute completion progress across all DayActivities for a trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    # Activities linked via a day belonging to the trip
    via_day = (
        db.query(models.DayActivity)
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(models.TripDay.trip_id == trip_id)
        .all()
    )
    # Activities linked via destination belonging to the trip (avoid double-counting day-linked ones)
    via_dest = (
        db.query(models.DayActivity)
        .join(
            models.Destination,
            models.DayActivity.destination_id == models.Destination.id,
        )
        .filter(models.Destination.trip_id == trip_id)
        .filter(models.DayActivity.day_id.is_(None))
        .all()
    )

    activities = via_day + via_dest
    total = len(activities)
    completed = sum(1 for a in activities if a.is_completed)
    progress = round(completed / total * 100) if total > 0 else 0

    return {
        "total_activities": total,
        "completed_activities": completed,
        "progress_percent": progress,
    }


def get_destinations_with_activities(trip_id: int, db: Session) -> Optional[list[dict]]:
    """Return each destination with its DayActivities (for the Activities tab)."""
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
        dest_activities = (
            db.query(models.DayActivity)
            .filter(models.DayActivity.destination_id == dest.id)
            .order_by(models.DayActivity.sort_order, models.DayActivity.start_time)
            .all()
        )
        result.append({"destination": dest, "activities": dest_activities})

    return result
