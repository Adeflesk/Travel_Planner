"""
app/routers/journey_stops.py - Journey stops endpoints router

CRUD endpoints for journey stops.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from database import get_db

router = APIRouter()


def check_journey_access(
    journey_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Journey:
    """Check user has access to the journey's trip."""
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return journey

    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip.id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return journey

    raise HTTPException(status_code=404, detail="Journey not found")


class ReorderRequest(BaseModel):
    """Request body for reordering stops."""

    stop_ids: List[int]


@router.post(
    "/journeys/{journey_id}/stops/",
    response_model=schemas.JourneyStop,
    status_code=201,
    tags=["journey-stops"],
)
def create_journey_stop(
    journey_id: int,
    stop: schemas.JourneyStopCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a stop to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    # Ensure journey_id in body matches path parameter
    if stop.journey_id != journey_id:
        raise HTTPException(
            status_code=400, detail="Journey ID in body must match path parameter"
        )

    db_stop = models.JourneyStop(**stop.model_dump())
    db.add(db_stop)
    db.commit()
    db.refresh(db_stop)
    return db_stop


@router.get(
    "/journeys/{journey_id}/stops/",
    response_model=List[schemas.JourneyStop],
    tags=["journey-stops"],
)
def get_journey_stops(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all stops for a journey."""
    check_journey_access(journey_id, db, current_user)

    stops = (
        db.query(models.JourneyStop)
        .filter(models.JourneyStop.journey_id == journey_id)
        .order_by(models.JourneyStop.order, models.JourneyStop.planned_arrival)
        .all()
    )
    return stops


@router.get(
    "/journeys/{journey_id}/stops/{stop_id}",
    response_model=schemas.JourneyStopWithOptions,
    tags=["journey-stops"],
)
def get_journey_stop(
    journey_id: int,
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific stop with its options."""
    check_journey_access(journey_id, db, current_user)

    stop = (
        db.query(models.JourneyStop)
        .filter(
            models.JourneyStop.id == stop_id,
            models.JourneyStop.journey_id == journey_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    return stop


@router.put(
    "/journeys/{journey_id}/stops/{stop_id}",
    response_model=schemas.JourneyStop,
    tags=["journey-stops"],
)
def update_journey_stop(
    journey_id: int,
    stop_id: int,
    stop_update: schemas.JourneyStopUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a journey stop."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    stop = (
        db.query(models.JourneyStop)
        .filter(
            models.JourneyStop.id == stop_id,
            models.JourneyStop.journey_id == journey_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    for key, value in stop_update.model_dump(exclude_unset=True).items():
        setattr(stop, key, value)

    db.commit()
    db.refresh(stop)
    return stop


@router.delete(
    "/journeys/{journey_id}/stops/{stop_id}",
    status_code=204,
    tags=["journey-stops"],
)
def delete_journey_stop(
    journey_id: int,
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a stop from a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    stop = (
        db.query(models.JourneyStop)
        .filter(
            models.JourneyStop.id == stop_id,
            models.JourneyStop.journey_id == journey_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    db.delete(stop)
    db.commit()
    return None


@router.patch(
    "/journeys/{journey_id}/stops/reorder",
    response_model=List[schemas.JourneyStop],
    tags=["journey-stops"],
)
def reorder_journey_stops(
    journey_id: int,
    reorder: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Reorder stops within a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    # Get all stops for this journey
    stops = (
        db.query(models.JourneyStop)
        .filter(models.JourneyStop.journey_id == journey_id)
        .all()
    )
    stop_map = {stop.id: stop for stop in stops}

    # Validate all IDs belong to this journey
    for i, stop_id in enumerate(reorder.stop_ids):
        if stop_id not in stop_map:
            raise HTTPException(
                status_code=400, detail=f"Stop {stop_id} not found in this journey"
            )
        stop_map[stop_id].order = i

    db.commit()

    # Return updated stops in order
    return (
        db.query(models.JourneyStop)
        .filter(models.JourneyStop.journey_id == journey_id)
        .order_by(models.JourneyStop.order)
        .all()
    )
