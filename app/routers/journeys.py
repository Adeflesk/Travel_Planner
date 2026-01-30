"""
app/routers/journeys.py - Journey endpoints router

CRUD and trip-scoped journey endpoints.

Author: Travel Planner Team
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db
from app.services.journey_service import (
    create_journey as svc_create_journey,
    get_trip_journeys as svc_get_trip_journeys,
    get_journey as svc_get_journey,
    update_journey as svc_update_journey,
    delete_journey as svc_delete_journey,
)

router = APIRouter()


@router.post(
    "/journeys/", response_model=schemas.Journey, status_code=201, tags=["journeys"]
)
def create_journey(journey: schemas.JourneyCreate, db: Session = Depends(get_db)):
    try:
        return svc_create_journey(journey, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/trips/{trip_id}/journeys/",
    response_model=List[schemas.Journey],
    tags=["journeys"],
)
def get_trip_journeys(trip_id: int, db: Session = Depends(get_db)):
    return svc_get_trip_journeys(trip_id, db)


@router.get("/journeys/{journey_id}", response_model=schemas.Journey, tags=["journeys"])
def get_journey(journey_id: int, db: Session = Depends(get_db)):
    journey = svc_get_journey(journey_id, db)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return journey


@router.put("/journeys/{journey_id}", response_model=schemas.Journey, tags=["journeys"])
def update_journey(
    journey_id: int,
    journey_update: schemas.JourneyUpdate,
    db: Session = Depends(get_db),
):
    try:
        return svc_update_journey(journey_id, journey_update, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/journeys/{journey_id}", status_code=204, tags=["journeys"])
def delete_journey(journey_id: int, db: Session = Depends(get_db)):
    try:
        svc_delete_journey(journey_id, db)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
