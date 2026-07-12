"""
app/routers/accommodations.py - Accommodation endpoints

Destination-scoped CRUD for accommodations.
Trip-level GET endpoint for day builder badge data.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.trip_access import TripAccess
from app.services.accommodation_service import (
    create_accommodation,
    get_accommodations_by_destination,
    get_accommodations_by_trip,
    update_accommodation,
    delete_accommodation,
)
from database import get_db

router = APIRouter()


def _check_destination(
    destination_id: int, trip_id: int, db: Session
) -> models.Destination:
    dest = (
        db.query(models.Destination)
        .filter(
            models.Destination.id == destination_id,
            models.Destination.trip_id == trip_id,
        )
        .first()
    )
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest


@router.get(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations",
    response_model=List[schemas.Accommodation],
    tags=["accommodations"],
)
def list_accommodations(
    destination_id: int,
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    _check_destination(destination_id, trip.id, db)
    return get_accommodations_by_destination(db, destination_id)


@router.post(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations",
    response_model=schemas.Accommodation,
    status_code=201,
    tags=["accommodations"],
)
def create_accommodation_endpoint(
    destination_id: int,
    data: schemas.AccommodationCreate,
    trip: models.Trip = Depends(TripAccess("edit")),
    db: Session = Depends(get_db),
):
    _check_destination(destination_id, trip.id, db)
    data.destination_id = destination_id
    data.trip_id = trip.id
    return create_accommodation(db, data)


@router.put(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations/{accommodation_id}",
    response_model=schemas.Accommodation,
    tags=["accommodations"],
)
def update_accommodation_endpoint(
    destination_id: int,
    accommodation_id: int,
    data: schemas.AccommodationUpdate,
    trip: models.Trip = Depends(TripAccess("edit")),
    db: Session = Depends(get_db),
):
    acc = (
        db.query(models.Accommodation)
        .filter(
            models.Accommodation.id == accommodation_id,
            models.Accommodation.destination_id == destination_id,
        )
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")
    return update_accommodation(db, acc, data)


@router.delete(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations/{accommodation_id}",
    status_code=204,
    tags=["accommodations"],
)
def delete_accommodation_endpoint(
    destination_id: int,
    accommodation_id: int,
    trip: models.Trip = Depends(TripAccess("edit")),
    db: Session = Depends(get_db),
):
    acc = (
        db.query(models.Accommodation)
        .filter(
            models.Accommodation.id == accommodation_id,
            models.Accommodation.destination_id == destination_id,
        )
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")
    delete_accommodation(db, acc)
    return None


@router.get(
    "/trips/{trip_id}/accommodations",
    response_model=List[schemas.Accommodation],
    tags=["accommodations"],
)
def list_trip_accommodations(
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    """Return all accommodations for a trip — used by day builder for badges."""
    return get_accommodations_by_trip(db, trip.id)
