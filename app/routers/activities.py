"""
app/routers/activities.py - Activity endpoints router

CRUD and destination-scoped activity endpoints.
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


def check_trip_access_via_destination(
    destination_id: int,
    db: Session,
    current_user: models.User,
    require_owner: bool = False,
) -> models.Destination:
    """Check user has access to the trip via destination."""
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    trip = db.query(models.Trip).filter(models.Trip.id == destination.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return destination

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
            return destination

    raise HTTPException(status_code=404, detail="Destination not found")


@router.post(
    "/activities/",
    response_model=schemas.Activity,
    status_code=201,
    tags=["activities"],
)
def create_activity(
    activity: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access_via_destination(
        activity.destination_id, db, current_user, require_owner=True
    )

    db_activity = models.Activity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


@router.get(
    "/destinations/{destination_id}/activities/",
    response_model=List[schemas.Activity],
    tags=["activities"],
)
def get_destination_activities(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access_via_destination(destination_id, db, current_user)
    activities = (
        db.query(models.Activity)
        .filter(models.Activity.destination_id == destination_id)
        .order_by(models.Activity.scheduled_date, models.Activity.scheduled_time)
        .all()
    )
    return activities


@router.put(
    "/activities/{activity_id}", response_model=schemas.Activity, tags=["activities"]
)
def update_activity(
    activity_id: int,
    activity_update: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = (
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    check_trip_access_via_destination(
        activity.destination_id, db, current_user, require_owner=True
    )

    for key, value in activity_update.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=204, tags=["activities"])
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = (
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    check_trip_access_via_destination(
        activity.destination_id, db, current_user, require_owner=True
    )

    db.delete(activity)
    db.commit()
    return None
