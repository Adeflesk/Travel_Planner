"""
app/routers/activities.py - Unified activity endpoints

All CRUD for DayActivity (day-linked and/or destination-linked).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.geocoding import geocode
from database import get_db

router = APIRouter(tags=["activities"])


def _get_activity_or_404(activity_id: int, db: Session) -> models.DayActivity:
    activity = (
        db.query(models.DayActivity)
        .filter(models.DayActivity.id == activity_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


def _check_trip_access(
    activity: models.DayActivity,
    db: Session,
    user: models.User,
    require_owner: bool = False,
) -> None:
    """Verify the user can access the trip this activity belongs to."""
    trip = None

    if activity.day_id:
        day = (
            db.query(models.TripDay)
            .filter(models.TripDay.id == activity.day_id)
            .first()
        )
        if day:
            trip = db.query(models.Trip).filter(models.Trip.id == day.trip_id).first()

    if trip is None and activity.destination_id:
        dest = (
            db.query(models.Destination)
            .filter(models.Destination.id == activity.destination_id)
            .first()
        )
        if dest:
            trip = db.query(models.Trip).filter(models.Trip.id == dest.trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Activity not found")

    if trip.user_id == user.id:
        return

    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip.id,
                models.TripShare.user_id == user.id,
            )
            .first()
        )
        if share:
            return

    raise HTTPException(status_code=404, detail="Activity not found")


def _require_trip_access(trip_id: int, db: Session, user: models.User) -> None:
    """Raise 404 if user cannot access this trip (not owner and not shared)."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id == user.id:
        return
    share = (
        db.query(models.TripShare)
        .filter(
            models.TripShare.trip_id == trip_id,
            models.TripShare.user_id == user.id,
        )
        .first()
    )
    if not share:
        raise HTTPException(status_code=404, detail="Trip not found")


@router.post(
    "/activities/",
    response_model=schemas.DayActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    activity: schemas.DayActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_activity = models.DayActivity(**activity.model_dump())

    # Geocode location if no coordinates were provided by the client
    if db_activity.location and db_activity.latitude is None:
        coords = geocode(db_activity.location)
        if coords:
            db_activity.latitude, db_activity.longitude = coords

    # Resolve trip_id for authorization
    trip_id_for_auth: int | None = None
    if activity.day_id:
        day = (
            db.query(models.TripDay)
            .filter(models.TripDay.id == activity.day_id)
            .first()
        )
        if not day:
            raise HTTPException(status_code=404, detail="Day not found")
        trip_id_for_auth = day.trip_id
    elif activity.destination_id:
        dest = (
            db.query(models.Destination)
            .filter(models.Destination.id == activity.destination_id)
            .first()
        )
        if not dest:
            raise HTTPException(status_code=404, detail="Destination not found")
        trip_id_for_auth = dest.trip_id

    if trip_id_for_auth is not None:
        trip = db.query(models.Trip).filter(models.Trip.id == trip_id_for_auth).first()
        if not trip or trip.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Not found")

    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


@router.get(
    "/trips/{trip_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_trip_activities(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """All DayActivities for a trip (via day or via destination)."""
    _require_trip_access(trip_id, db, current_user)

    via_day = (
        db.query(models.DayActivity)
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(models.TripDay.trip_id == trip_id)
        .all()
    )
    via_dest = (
        db.query(models.DayActivity)
        .join(
            models.Destination,
            models.DayActivity.destination_id == models.Destination.id,
        )
        .filter(models.Destination.trip_id == trip_id)
        .filter(models.DayActivity.day_id.is_(None))
        .all()
    )
    return via_day + via_dest


@router.get(
    "/trip-days/{day_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_day_activities(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    day = db.query(models.TripDay).filter(models.TripDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    _require_trip_access(day.trip_id, db, current_user)
    return (
        db.query(models.DayActivity)
        .filter(models.DayActivity.day_id == day_id)
        .order_by(models.DayActivity.start_time)
        .all()
    )


@router.get(
    "/destinations/{destination_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_destination_activities(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dest = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    _require_trip_access(dest.trip_id, db, current_user)
    return (
        db.query(models.DayActivity)
        .filter(models.DayActivity.destination_id == destination_id)
        .order_by(models.DayActivity.sort_order, models.DayActivity.start_time)
        .all()
    )


@router.patch(
    "/activities/{activity_id}",
    response_model=schemas.DayActivityResponse,
)
def update_activity(
    activity_id: int,
    update: schemas.DayActivityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = _get_activity_or_404(activity_id, db)
    _check_trip_access(activity, db, current_user, require_owner=True)

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    # Re-geocode if location changed and latitude is now None
    if update.location and update.latitude is None:
        coords = geocode(update.location)
        if coords:
            activity.latitude, activity.longitude = coords

    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = _get_activity_or_404(activity_id, db)
    _check_trip_access(activity, db, current_user, require_owner=True)
    db.delete(activity)
    db.commit()
