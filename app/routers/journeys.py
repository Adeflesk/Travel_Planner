"""
app/routers/journeys.py - Journey endpoints router

CRUD and trip-scoped journey endpoints.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from database import get_db
from app.services.journey_service import (
    create_journey as svc_create_journey,
    get_trip_journeys as svc_get_trip_journeys,
    get_journey as svc_get_journey,
    update_journey as svc_update_journey,
    delete_journey as svc_delete_journey,
)

router = APIRouter()


def check_trip_access(
    trip_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Trip:
    """Check user has access to the trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return trip

    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return trip

    raise HTTPException(status_code=404, detail="Trip not found")


@router.post(
    "/journeys/", response_model=schemas.Journey, status_code=201, tags=["journeys"]
)
def create_journey(
    journey: schemas.JourneyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access(journey.trip_id, db, current_user, require_owner=True)
    try:
        return svc_create_journey(journey, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/trips/{trip_id}/journeys/",
    response_model=List[schemas.Journey],
    tags=["journeys"],
)
def get_trip_journeys(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access(trip_id, db, current_user)
    return svc_get_trip_journeys(trip_id, db)


@router.get("/journeys/{journey_id}", response_model=schemas.Journey, tags=["journeys"])
def get_journey(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = svc_get_journey(journey_id, db)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    check_trip_access(journey.trip_id, db, current_user)
    return journey


@router.put("/journeys/{journey_id}", response_model=schemas.Journey, tags=["journeys"])
def update_journey(
    journey_id: int,
    journey_update: schemas.JourneyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = svc_get_journey(journey_id, db)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    check_trip_access(journey.trip_id, db, current_user, require_owner=True)
    try:
        return svc_update_journey(journey_id, journey_update, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/journeys/{journey_id}", status_code=204, tags=["journeys"])
def delete_journey(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = svc_get_journey(journey_id, db)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    check_trip_access(journey.trip_id, db, current_user, require_owner=True)
    try:
        svc_delete_journey(journey_id, db)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
