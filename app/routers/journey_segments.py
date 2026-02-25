"""
app/routers/journey_segments.py - Journey segment endpoints
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.journey_segment_service import (
    create_journey_segment as svc_create_segment,
    delete_journey_segment as svc_delete_segment,
    get_journey_segment as svc_get_segment,
    get_journey_segments as svc_get_segments,
    update_journey_segment as svc_update_segment,
)
from database import get_db

router = APIRouter()


def _check_trip_access(
    trip_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Trip:
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


def _get_journey_or_404(journey_id: int, db: Session) -> models.Journey:
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return journey


@router.get(
    "/journeys/{journey_id}/segments",
    response_model=List[schemas.JourneySegment],
    tags=["journey_segments"],
)
def get_journey_segments(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = _get_journey_or_404(journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user)
    return svc_get_segments(journey_id, db)


@router.post(
    "/journeys/{journey_id}/segments",
    response_model=schemas.JourneySegment,
    status_code=201,
    tags=["journey_segments"],
)
def create_journey_segment(
    journey_id: int,
    segment: schemas.JourneySegmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = _get_journey_or_404(journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user, require_owner=True)

    if segment.journey_id != journey_id:
        raise HTTPException(status_code=400, detail="Journey ID mismatch")

    try:
        return svc_create_segment(segment, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/journey-segments/{segment_id}",
    response_model=schemas.JourneySegment,
    tags=["journey_segments"],
)
def get_journey_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user)
    return segment


@router.put(
    "/journey-segments/{segment_id}",
    response_model=schemas.JourneySegment,
    tags=["journey_segments"],
)
def update_journey_segment(
    segment_id: int,
    segment_update: schemas.JourneySegmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user, require_owner=True)

    try:
        return svc_update_segment(segment_id, segment_update, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/journey-segments/{segment_id}",
    status_code=204,
    tags=["journey_segments"],
)
def delete_journey_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user, require_owner=True)

    try:
        svc_delete_segment(segment_id, db)
        return None
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/journey-segments/{segment_id}/activities",
    response_model=List[schemas.Activity],
    tags=["journey_segments"],
)
def get_segment_activities(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all activities for a journey segment"""
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user)

    activities = (
        db.query(models.Activity).filter(models.Activity.segment_id == segment_id).all()
    )
    return activities


@router.post(
    "/journey-segments/{segment_id}/activities",
    response_model=schemas.Activity,
    status_code=201,
    tags=["journey_segments"],
)
def create_segment_activity(
    segment_id: int,
    activity: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create an activity for a journey segment"""
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user, require_owner=True)

    # Set segment_id if not already provided
    if activity.segment_id is None:
        activity.segment_id = segment_id
    elif activity.segment_id != segment_id:
        raise HTTPException(status_code=400, detail="Segment ID mismatch")

    # Create the activity
    db_activity = models.Activity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


@router.get(
    "/journey-segments/{segment_id}/expenses",
    response_model=List[schemas.Expense],
    tags=["journey_segments"],
)
def get_segment_expenses(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all expenses for a journey segment"""
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    _check_trip_access(journey.trip_id, db, current_user)

    expenses = (
        db.query(models.Expense).filter(models.Expense.segment_id == segment_id).all()
    )
    return expenses


@router.post(
    "/journey-segments/{segment_id}/expenses",
    response_model=schemas.Expense,
    status_code=201,
    tags=["journey_segments"],
)
def create_segment_expense(
    segment_id: int,
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create an expense for a journey segment"""
    segment = svc_get_segment(segment_id, db)
    if not segment:
        raise HTTPException(status_code=404, detail="Journey segment not found")

    journey = _get_journey_or_404(segment.journey_id, db)
    trip = _check_trip_access(journey.trip_id, db, current_user, require_owner=True)

    # Set segment_id if not already provided
    if expense.segment_id is None:
        expense.segment_id = segment_id
    elif expense.segment_id != segment_id:
        raise HTTPException(status_code=400, detail="Segment ID mismatch")

    # Ensure trip_id matches the journey's trip
    if expense.trip_id != trip.id:
        raise HTTPException(status_code=400, detail="Trip ID mismatch")

    # Create the expense
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense
