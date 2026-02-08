"""
app/routers/destinations.py - Destination endpoints router

CRUD and trip-scoped destination endpoints.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from app.services import weather_service
from database import get_db

router = APIRouter()


def get_trip_for_destination(
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
    "/destinations/",
    response_model=schemas.Destination,
    status_code=201,
    tags=["destinations"],
)
def create_destination(
    destination: schemas.DestinationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_for_destination(destination.trip_id, db, current_user, require_owner=True)

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
def get_trip_destinations(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_for_destination(trip_id, db, current_user)
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
def get_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    get_trip_for_destination(destination.trip_id, db, current_user)
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
    current_user: models.User = Depends(get_current_user),
):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    get_trip_for_destination(destination.trip_id, db, current_user, require_owner=True)

    for key, value in destination_update.model_dump(exclude_unset=True).items():
        setattr(destination, key, value)

    db.commit()
    db.refresh(destination)
    return destination


@router.delete("/destinations/{destination_id}", status_code=204, tags=["destinations"])
def delete_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    get_trip_for_destination(destination.trip_id, db, current_user, require_owner=True)

    db.delete(destination)
    db.commit()
    return None


@router.get(
    "/destinations/{destination_id}/weather",
    response_model=schemas.WeatherForecast,
    tags=["destinations"],
)
def get_destination_weather(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get weather forecast for a destination.

    Fetches current weather and forecast from OpenWeatherMap API.
    Results are cached for 6 hours to minimize API calls.
    """
    # Get destination and verify it exists
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    # Check user has access to the trip
    get_trip_for_destination(destination.trip_id, db, current_user)

    # Build location string for weather API
    location_parts = [destination.name]
    if destination.country:
        location_parts.append(destination.country)
    location = ", ".join(location_parts)

    # Get date range from destination
    start_date = (
        destination.arrival_date.isoformat() if destination.arrival_date else None
    )
    end_date = (
        destination.departure_date.isoformat() if destination.departure_date else None
    )

    # Fetch weather data
    weather_data = weather_service.fetch_weather(location, start_date, end_date)

    if not weather_data:
        raise HTTPException(
            status_code=503,
            detail="Weather service temporarily unavailable. Please try again later.",
        )

    return weather_data
