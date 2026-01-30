"""
app/routers/destinations.py - Destination endpoints router

CRUD and trip-scoped destination endpoints.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db

router = APIRouter()


@router.post(
    "/destinations/",
    response_model=schemas.Destination,
    status_code=201,
    tags=["destinations"],
)
def create_destination(
    destination: schemas.DestinationCreate, db: Session = Depends(get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.id == destination.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db_destination = models.Destination(**destination.model_dump())
    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)
    return db_destination


@router.get(
    "/trips/{trip_id}/destinations/",
    response_model=List[schemas.Destination],
    tags=["destinations"],
)
def get_trip_destinations(trip_id: int, db: Session = Depends(get_db)):
    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )
    return destinations


@router.get(
    "/destinations/{destination_id}",
    response_model=schemas.Destination,
    tags=["destinations"],
)
def get_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@router.put(
    "/destinations/{destination_id}",
    response_model=schemas.Destination,
    tags=["destinations"],
)
def update_destination(
    destination_id: int,
    destination_update: schemas.DestinationUpdate,
    db: Session = Depends(get_db),
):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    for key, value in destination_update.model_dump(exclude_unset=True).items():
        setattr(destination, key, value)

    db.commit()
    db.refresh(destination)
    return destination


@router.delete("/destinations/{destination_id}", status_code=204, tags=["destinations"])
def delete_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    db.delete(destination)
    db.commit()
    return None
