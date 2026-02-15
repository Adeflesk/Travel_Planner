"""
app/routers/journey_options.py - Journey options endpoints router

CRUD endpoints for journey booking options.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
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


@router.post(
    "/journeys/{journey_id}/options/",
    response_model=schemas.JourneyOption,
    status_code=201,
    tags=["journey-options"],
)
def create_journey_option(
    journey_id: int,
    option: schemas.JourneyOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a booking option to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    # Ensure journey_id in body matches path parameter
    if option.journey_id != journey_id:
        raise HTTPException(
            status_code=400, detail="Journey ID in body must match path parameter"
        )

    db_option = models.JourneyOption(**option.model_dump())
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option


@router.get(
    "/journeys/{journey_id}/options/",
    response_model=List[schemas.JourneyOption],
    tags=["journey-options"],
)
def get_journey_options(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all booking options for a journey."""
    check_journey_access(journey_id, db, current_user)

    options = (
        db.query(models.JourneyOption)
        .filter(models.JourneyOption.journey_id == journey_id)
        .order_by(models.JourneyOption.order, models.JourneyOption.name)
        .all()
    )
    return options


@router.get(
    "/journeys/{journey_id}/options/{option_id}",
    response_model=schemas.JourneyOption,
    tags=["journey-options"],
)
def get_journey_option(
    journey_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific booking option."""
    check_journey_access(journey_id, db, current_user)

    option = (
        db.query(models.JourneyOption)
        .filter(
            models.JourneyOption.id == option_id,
            models.JourneyOption.journey_id == journey_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    return option


@router.put(
    "/journeys/{journey_id}/options/{option_id}",
    response_model=schemas.JourneyOption,
    tags=["journey-options"],
)
def update_journey_option(
    journey_id: int,
    option_id: int,
    option_update: schemas.JourneyOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a journey booking option."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    option = (
        db.query(models.JourneyOption)
        .filter(
            models.JourneyOption.id == option_id,
            models.JourneyOption.journey_id == journey_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    for key, value in option_update.model_dump(exclude_unset=True).items():
        setattr(option, key, value)

    db.commit()
    db.refresh(option)
    return option


@router.delete(
    "/journeys/{journey_id}/options/{option_id}",
    status_code=204,
    tags=["journey-options"],
)
def delete_journey_option(
    journey_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a booking option from a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    option = (
        db.query(models.JourneyOption)
        .filter(
            models.JourneyOption.id == option_id,
            models.JourneyOption.journey_id == journey_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    db.delete(option)
    db.commit()
    return None


@router.patch(
    "/journeys/{journey_id}/options/{option_id}/select",
    response_model=schemas.JourneyOption,
    tags=["journey-options"],
)
def select_journey_option(
    journey_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark an option as selected (and unselect others)."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    option = (
        db.query(models.JourneyOption)
        .filter(
            models.JourneyOption.id == option_id,
            models.JourneyOption.journey_id == journey_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    # Unselect all other options
    db.query(models.JourneyOption).filter(
        models.JourneyOption.journey_id == journey_id,
        models.JourneyOption.id != option_id,
        models.JourneyOption.status == "selected",
    ).update({"status": "researching"})

    # Mark this option as selected
    option.status = "selected"
    db.commit()
    db.refresh(option)
    return option


@router.patch(
    "/journeys/{journey_id}/options/reorder",
    response_model=List[schemas.JourneyOption],
    tags=["journey-options"],
)
def reorder_journey_options(
    journey_id: int,
    reorder: schemas.JourneyOptionReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Reorder journey booking options."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    # Update order for each option
    for index, option_id in enumerate(reorder.option_ids):
        option = (
            db.query(models.JourneyOption)
            .filter(
                models.JourneyOption.id == option_id,
                models.JourneyOption.journey_id == journey_id,
            )
            .first()
        )
        if option:
            option.order = index

    db.commit()

    # Return updated list
    options = (
        db.query(models.JourneyOption)
        .filter(models.JourneyOption.journey_id == journey_id)
        .order_by(models.JourneyOption.order)
        .all()
    )
    return options
