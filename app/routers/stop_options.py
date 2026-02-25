"""
app/routers/stop_options.py - Stop options endpoints router

CRUD endpoints for stop options.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from database import get_db

router = APIRouter()


def check_segment_access(
    segment_id: int,
    db: Session,
    current_user: models.User,
    require_owner: bool = False,
) -> models.JourneySegment:
    """Check user has access to the segment's journey's trip."""
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    journey = (
        db.query(models.Journey).filter(models.Journey.id == segment.journey_id).first()
    )
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return segment

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
            return segment

    raise HTTPException(status_code=404, detail="Segment not found")


def check_stop_access(
    stop_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.JourneyStop:
    """Check user has access to the stop's journey's trip."""
    stop = db.query(models.JourneyStop).filter(models.JourneyStop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    journey = (
        db.query(models.Journey).filter(models.Journey.id == stop.journey_id).first()
    )
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return stop

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
            return stop

    raise HTTPException(status_code=404, detail="Stop not found")


@router.post(
    "/stops/{stop_id}/options/",
    response_model=schemas.StopOption,
    status_code=201,
    tags=["stop-options"],
)
def create_stop_option(
    stop_id: int,
    option: schemas.StopOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add an option to a stop."""
    check_stop_access(stop_id, db, current_user, require_owner=True)

    data = option.model_dump()
    data["stop_id"] = stop_id
    data.pop("segment_id", None)
    db_option = models.StopOption(**data)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option


@router.get(
    "/stops/{stop_id}/options/",
    response_model=List[schemas.StopOption],
    tags=["stop-options"],
)
def get_stop_options(
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all options for a stop."""
    check_stop_access(stop_id, db, current_user)

    options = (
        db.query(models.StopOption)
        .filter(models.StopOption.stop_id == stop_id)
        .order_by(models.StopOption.order, models.StopOption.name)
        .all()
    )
    return options


@router.get(
    "/stops/{stop_id}/options/{option_id}",
    response_model=schemas.StopOption,
    tags=["stop-options"],
)
def get_stop_option(
    stop_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific option."""
    check_stop_access(stop_id, db, current_user)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.stop_id == stop_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    return option


@router.put(
    "/stops/{stop_id}/options/{option_id}",
    response_model=schemas.StopOption,
    tags=["stop-options"],
)
def update_stop_option(
    stop_id: int,
    option_id: int,
    option_update: schemas.StopOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a stop option."""
    check_stop_access(stop_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.stop_id == stop_id,
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
    "/stops/{stop_id}/options/{option_id}",
    status_code=204,
    tags=["stop-options"],
)
def delete_stop_option(
    stop_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove an option from a stop."""
    check_stop_access(stop_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.stop_id == stop_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    db.delete(option)
    db.commit()
    return None


@router.patch(
    "/stops/{stop_id}/options/{option_id}/status",
    response_model=schemas.StopOption,
    tags=["stop-options"],
)
def update_option_status(
    stop_id: int,
    option_id: int,
    status_update: schemas.StopOptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update just the status of an option."""
    check_stop_access(stop_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.stop_id == stop_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    option.status = status_update.status
    db.commit()
    db.refresh(option)
    return option


# --- Segment-based stop option endpoints ---


@router.post(
    "/segments/{segment_id}/stop-options/",
    response_model=schemas.StopOption,
    status_code=201,
    tags=["stop-options"],
)
def create_segment_stop_option(
    segment_id: int,
    option: schemas.StopOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a stop option to a segment (segment_type='stop')."""
    segment = check_segment_access(segment_id, db, current_user, require_owner=True)

    if segment.segment_type != "stop":
        raise HTTPException(
            status_code=400, detail="Stop options can only be added to stop segments"
        )

    data = option.model_dump()
    data["segment_id"] = segment_id
    data.pop("stop_id", None)
    db_option = models.StopOption(**data)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option


@router.get(
    "/segments/{segment_id}/stop-options/",
    response_model=List[schemas.StopOption],
    tags=["stop-options"],
)
def get_segment_stop_options(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all stop options for a segment."""
    check_segment_access(segment_id, db, current_user)

    options = (
        db.query(models.StopOption)
        .filter(models.StopOption.segment_id == segment_id)
        .order_by(models.StopOption.order, models.StopOption.name)
        .all()
    )
    return options


@router.put(
    "/segments/{segment_id}/stop-options/{option_id}",
    response_model=schemas.StopOption,
    tags=["stop-options"],
)
def update_segment_stop_option(
    segment_id: int,
    option_id: int,
    option_update: schemas.StopOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a stop option on a segment."""
    check_segment_access(segment_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.segment_id == segment_id,
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
    "/segments/{segment_id}/stop-options/{option_id}",
    status_code=204,
    tags=["stop-options"],
)
def delete_segment_stop_option(
    segment_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a stop option from a segment."""
    check_segment_access(segment_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.segment_id == segment_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    db.delete(option)
    db.commit()
    return None


@router.patch(
    "/segments/{segment_id}/stop-options/{option_id}/status",
    response_model=schemas.StopOption,
    tags=["stop-options"],
)
def update_segment_option_status(
    segment_id: int,
    option_id: int,
    status_update: schemas.StopOptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update just the status of a segment stop option."""
    check_segment_access(segment_id, db, current_user, require_owner=True)

    option = (
        db.query(models.StopOption)
        .filter(
            models.StopOption.id == option_id,
            models.StopOption.segment_id == segment_id,
        )
        .first()
    )
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    option.status = status_update.status
    db.commit()
    db.refresh(option)
    return option
