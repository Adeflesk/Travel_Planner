"""
app/services/journey_service.py - Journey related services

Provides CRUD operations for journeys with validation.

Author: Travel Planner Team
"""

from typing import List
from sqlalchemy.orm import Session
import models


def create_journey(journey_data, db: Session):
    trip = db.query(models.Trip).filter(models.Trip.id == journey_data.trip_id).first()
    if not trip:
        raise ValueError("Trip not found")

    if getattr(journey_data, "origin_id", None):
        origin = (
            db.query(models.Destination)
            .filter(models.Destination.id == journey_data.origin_id)
            .first()
        )
        if not origin:
            raise ValueError("Origin destination not found")

    if getattr(journey_data, "destination_id", None):
        destination = (
            db.query(models.Destination)
            .filter(models.Destination.id == journey_data.destination_id)
            .first()
        )
        if not destination:
            raise ValueError("Destination destination not found")

    journey_payload = journey_data.model_dump()
    # Segments are managed via the segment endpoints.
    journey_payload.pop("segments", None)
    db_journey = models.Journey(**journey_payload)
    db.add(db_journey)
    db.commit()
    db.refresh(db_journey)
    return db_journey


def get_trip_journeys(trip_id: int, db: Session) -> List[models.Journey]:
    return (
        db.query(models.Journey)
        .filter(models.Journey.trip_id == trip_id)
        .order_by(models.Journey.order, models.Journey.departure_datetime)
        .all()
    )


def get_journey(journey_id: int, db: Session):
    return db.query(models.Journey).filter(models.Journey.id == journey_id).first()


def update_journey(journey_id: int, journey_update, db: Session):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise ValueError("Journey not found")

    update_data = journey_update.model_dump(exclude_unset=True)
    # Segments are updated via the segment endpoints.
    update_data.pop("segments", None)
    if "origin_id" in update_data and update_data["origin_id"]:
        origin = (
            db.query(models.Destination)
            .filter(models.Destination.id == update_data["origin_id"])
            .first()
        )
        if not origin:
            raise ValueError("Origin destination not found")

    if "destination_id" in update_data and update_data["destination_id"]:
        destination = (
            db.query(models.Destination)
            .filter(models.Destination.id == update_data["destination_id"])
            .first()
        )
        if not destination:
            raise ValueError("Destination destination not found")

    for key, value in update_data.items():
        setattr(journey, key, value)

    db.commit()
    db.refresh(journey)
    return journey


def delete_journey(journey_id: int, db: Session):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise ValueError("Journey not found")

    db.delete(journey)
    db.commit()
    return True
