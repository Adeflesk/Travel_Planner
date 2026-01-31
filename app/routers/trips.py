"""
app/routers/trips.py - Trip endpoints router

CRUD endpoints and trip-level aggregates for trips.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.activity_service import (
    get_destinations_with_activities as svc_get_destinations_with_activities,
    get_trip_progress as svc_get_trip_progress,
)
from app.services.expense_service import get_expense_summary as svc_get_expense_summary
from app.services.timeline_service import (
    get_accommodation_expenses as svc_get_accommodation_expenses,
    get_timeline as svc_get_timeline,
)
from database import get_db

router = APIRouter()


def get_trip_or_404(
    trip_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Trip:
    """
    Get a trip by ID, checking user access.

    Args:
        trip_id: The trip ID
        db: Database session
        current_user: The authenticated user
        require_owner: If True, only owner can access (not shared users)

    Returns:
        The trip if found and accessible

    Raises:
        HTTPException 404: If trip not found or not accessible
    """
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check if user is owner
    if trip.user_id == current_user.id:
        return trip

    # Check if user has shared access (only for read operations)
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


@router.post("/trips/", response_model=schemas.Trip, status_code=201, tags=["trips"])
def create_trip(
    trip: schemas.TripCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_trip = models.Trip(**trip.model_dump(), user_id=current_user.id)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


@router.get("/trips/", response_model=List[schemas.TripWithOwnership], tags=["trips"])
def get_trips(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    # Get trips owned by user
    owned_trips = (
        db.query(models.Trip).filter(models.Trip.user_id == current_user.id).all()
    )

    # Get trips shared with user (with owner email)
    shared_trip_data = (
        db.query(models.Trip, models.User.email)
        .join(models.TripShare, models.Trip.id == models.TripShare.trip_id)
        .join(models.User, models.Trip.user_id == models.User.id)
        .filter(models.TripShare.user_id == current_user.id)
        .all()
    )

    # Build result with ownership info
    result = []
    for trip in owned_trips:
        trip_dict = schemas.Trip.model_validate(trip).model_dump()
        trip_dict["is_owner"] = True
        trip_dict["shared_by"] = None
        result.append(schemas.TripWithOwnership(**trip_dict))

    for trip, owner_email in shared_trip_data:
        trip_dict = schemas.Trip.model_validate(trip).model_dump()
        trip_dict["is_owner"] = False
        trip_dict["shared_by"] = owner_email
        result.append(schemas.TripWithOwnership(**trip_dict))

    # Sort by created_at desc
    result.sort(key=lambda t: t.created_at, reverse=True)
    return result


@router.get(
    "/trips/{trip_id}", response_model=schemas.TripWithOwnership, tags=["trips"]
)
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = get_trip_or_404(trip_id, db, current_user)
    is_owner = trip.user_id == current_user.id

    trip_dict = schemas.Trip.model_validate(trip).model_dump()
    trip_dict["is_owner"] = is_owner
    trip_dict["shared_by"] = None

    if not is_owner:
        # Get owner's email
        owner = db.query(models.User).filter(models.User.id == trip.user_id).first()
        trip_dict["shared_by"] = owner.email if owner else "Unknown"

    return schemas.TripWithOwnership(**trip_dict)


@router.put("/trips/{trip_id}", response_model=schemas.Trip, tags=["trips"])
def update_trip(
    trip_id: int,
    trip_update: schemas.TripUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = get_trip_or_404(trip_id, db, current_user, require_owner=True)

    for key, value in trip_update.model_dump(exclude_unset=True).items():
        setattr(trip, key, value)

    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/trips/{trip_id}", status_code=204, tags=["trips"])
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = get_trip_or_404(trip_id, db, current_user, require_owner=True)
    db.delete(trip)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/expenses/summary/",
    response_model=schemas.ExpenseSummary,
    tags=["trips"],
)
def get_expense_summary(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_expense_summary(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/progress/", response_model=schemas.TripProgress, tags=["trips"]
)
def get_trip_progress(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_trip_progress(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/destinations-with-activities/",
    response_model=List[schemas.DestinationWithActivities],
    tags=["trips"],
)
def get_destinations_with_activities(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_destinations_with_activities(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/timeline/",
    response_model=List[schemas.TimelineItem],
    tags=["trips"],
)
def get_trip_timeline(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_timeline(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/accommodation-expenses/",
    response_model=List[schemas.DestinationAccommodation],
    tags=["trips"],
)
def get_accommodation_expenses(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_accommodation_expenses(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


# ==================== TRIP SHARING ENDPOINTS ====================


@router.get(
    "/trips/{trip_id}/shares/",
    response_model=List[schemas.TripShareResponse],
    tags=["trips"],
)
def get_trip_shares(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all shares for a trip (owner only)."""
    get_trip_or_404(trip_id, db, current_user, require_owner=True)

    shares = (
        db.query(models.TripShare).filter(models.TripShare.trip_id == trip_id).all()
    )

    result = []
    for share in shares:
        user = db.query(models.User).filter(models.User.id == share.user_id).first()
        result.append(
            schemas.TripShareResponse.from_orm_with_email(
                share, user.email if user else "Unknown"
            )
        )
    return result


@router.post(
    "/trips/{trip_id}/shares/",
    response_model=schemas.TripShareResponse,
    status_code=201,
    tags=["trips"],
)
def create_trip_share(
    trip_id: int,
    share_data: schemas.TripShareCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Share a trip with another user (owner only)."""
    get_trip_or_404(trip_id, db, current_user, require_owner=True)

    # Find user by email
    user = db.query(models.User).filter(models.User.email == share_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Can't share with yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share trip with yourself")

    # Check if already shared
    existing = (
        db.query(models.TripShare)
        .filter(
            models.TripShare.trip_id == trip_id, models.TripShare.user_id == user.id
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Trip already shared with this user"
        )

    # Create share
    share = models.TripShare(
        trip_id=trip_id,
        user_id=user.id,
        permission="view",
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    return schemas.TripShareResponse.from_orm_with_email(share, user.email)


@router.delete("/trips/{trip_id}/shares/{share_id}", status_code=204, tags=["trips"])
def delete_trip_share(
    trip_id: int,
    share_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a share from a trip (owner only)."""
    get_trip_or_404(trip_id, db, current_user, require_owner=True)

    share = (
        db.query(models.TripShare)
        .filter(models.TripShare.id == share_id, models.TripShare.trip_id == trip_id)
        .first()
    )
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    db.delete(share)
    db.commit()
    return None
