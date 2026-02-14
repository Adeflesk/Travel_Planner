"""
app/routers/flight_layovers.py - Flight layover endpoints router

CRUD endpoints for flight layovers.
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
    """Request body for reordering layovers."""

    layover_ids: List[int]


@router.post(
    "/journeys/{journey_id}/layovers/",
    response_model=schemas.FlightLayover,
    status_code=201,
    tags=["flight-layovers"],
)
def create_layover(
    journey_id: int,
    layover: schemas.FlightLayoverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a layover to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    if layover.journey_id != journey_id:
        raise HTTPException(
            status_code=400, detail="Journey ID in body must match path parameter"
        )

    db_layover = models.FlightLayover(**layover.model_dump())
    db.add(db_layover)
    db.commit()
    db.refresh(db_layover)
    return db_layover


@router.get(
    "/journeys/{journey_id}/layovers/",
    response_model=List[schemas.FlightLayover],
    tags=["flight-layovers"],
)
def get_journey_layovers(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all layovers for a journey."""
    check_journey_access(journey_id, db, current_user)

    layovers = (
        db.query(models.FlightLayover)
        .filter(models.FlightLayover.journey_id == journey_id)
        .order_by(models.FlightLayover.order, models.FlightLayover.arrival_datetime)
        .all()
    )
    return layovers


@router.get(
    "/journeys/{journey_id}/layovers/{layover_id}",
    response_model=schemas.FlightLayover,
    tags=["flight-layovers"],
)
def get_layover(
    journey_id: int,
    layover_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific layover."""
    check_journey_access(journey_id, db, current_user)

    layover = (
        db.query(models.FlightLayover)
        .filter(
            models.FlightLayover.id == layover_id,
            models.FlightLayover.journey_id == journey_id,
        )
        .first()
    )
    if not layover:
        raise HTTPException(status_code=404, detail="Layover not found")
    return layover


@router.put(
    "/journeys/{journey_id}/layovers/{layover_id}",
    response_model=schemas.FlightLayover,
    tags=["flight-layovers"],
)
def update_layover(
    journey_id: int,
    layover_id: int,
    layover_update: schemas.FlightLayoverUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a flight layover."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    layover = (
        db.query(models.FlightLayover)
        .filter(
            models.FlightLayover.id == layover_id,
            models.FlightLayover.journey_id == journey_id,
        )
        .first()
    )
    if not layover:
        raise HTTPException(status_code=404, detail="Layover not found")

    for key, value in layover_update.model_dump(exclude_unset=True).items():
        setattr(layover, key, value)

    db.commit()
    db.refresh(layover)
    return layover


@router.delete(
    "/journeys/{journey_id}/layovers/{layover_id}",
    status_code=204,
    tags=["flight-layovers"],
)
def delete_layover(
    journey_id: int,
    layover_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a layover from a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    layover = (
        db.query(models.FlightLayover)
        .filter(
            models.FlightLayover.id == layover_id,
            models.FlightLayover.journey_id == journey_id,
        )
        .first()
    )
    if not layover:
        raise HTTPException(status_code=404, detail="Layover not found")

    db.delete(layover)
    db.commit()
    return None


@router.patch(
    "/journeys/{journey_id}/layovers/reorder",
    response_model=List[schemas.FlightLayover],
    tags=["flight-layovers"],
)
def reorder_layovers(
    journey_id: int,
    reorder: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Reorder layovers within a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    layovers = (
        db.query(models.FlightLayover)
        .filter(models.FlightLayover.journey_id == journey_id)
        .all()
    )
    layover_map = {lay.id: lay for lay in layovers}

    for i, layover_id in enumerate(reorder.layover_ids):
        if layover_id not in layover_map:
            raise HTTPException(
                status_code=400,
                detail=f"Layover {layover_id} not found in this journey",
            )
        layover_map[layover_id].order = i

    db.commit()

    return (
        db.query(models.FlightLayover)
        .filter(models.FlightLayover.journey_id == journey_id)
        .order_by(models.FlightLayover.order)
        .all()
    )
