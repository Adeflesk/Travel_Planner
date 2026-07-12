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
from app.core.trip_access import TripAccess, get_trip_with_access
from app.services import weather_service
from app.services.exchange_rate import infer_base_currency
from app.services.geocoding import geocode
from database import get_db

router = APIRouter()


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
    get_trip_with_access(destination.trip_id, db, current_user, "edit")

    db_destination = models.Destination(**destination.model_dump())

    # Geocode name if no coordinates were provided
    if db_destination.latitude is None:
        query = ", ".join(filter(None, [db_destination.name, db_destination.country]))
        if query:
            coords = geocode(query)
            if coords:
                db_destination.latitude, db_destination.longitude = coords

    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)

    # Infer base currency from first destination's country if trip has no explicit currency
    trip = db.get(models.Trip, destination.trip_id)
    if trip and not trip.default_currency and db_destination.country:
        existing_count = (
            db.query(models.Destination)
            .filter(
                models.Destination.trip_id == destination.trip_id,
                models.Destination.id != db_destination.id,
            )
            .count()
        )
        if existing_count == 0:  # This is the first destination
            trip.default_currency = infer_base_currency(db_destination.country)
            db.commit()

    return db_destination


@router.get(
    "/trips/{trip_id}/destinations/",
    response_model=List[schemas.Destination],
    tags=["destinations"],
)
def get_trip_destinations(
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip.id)
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

    get_trip_with_access(destination.trip_id, db, current_user, "view")
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

    get_trip_with_access(destination.trip_id, db, current_user, "edit")

    for key, value in destination_update.model_dump(exclude_unset=True).items():
        setattr(destination, key, value)

    # Re-geocode if latitude is now None (e.g. name changed, coords cleared)
    if destination.latitude is None and destination.name:
        query = ", ".join(filter(None, [destination.name, destination.country]))
        coords = geocode(query)
        if coords:
            destination.latitude, destination.longitude = coords

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

    get_trip_with_access(destination.trip_id, db, current_user, "edit")

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
    get_trip_with_access(destination.trip_id, db, current_user, "view")

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
