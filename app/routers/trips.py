"""
app/routers/trips.py - Trip endpoints router

CRUD endpoints and trip-level aggregates for trips.
All endpoints require authentication.

Author: Travel Planner Team
"""

from datetime import date
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.activity_service import (
    get_destinations_with_activities as svc_get_destinations_with_activities,
    get_trip_progress as svc_get_trip_progress,
)
from app.services.budget_service import get_budget_status as svc_get_budget_status
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
    # Single query with JOIN to get trip and owner email (avoids N+1)
    result = (
        db.query(models.Trip, models.User.email)
        .join(models.User, models.Trip.user_id == models.User.id)
        .filter(models.Trip.id == trip_id)
        .first()
    )

    if not result:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip, owner_email = result
    is_owner = trip.user_id == current_user.id

    # Check access if not owner
    if not is_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if not share:
            raise HTTPException(status_code=404, detail="Trip not found")

    trip_dict = schemas.Trip.model_validate(trip).model_dump()
    trip_dict["is_owner"] = is_owner
    trip_dict["shared_by"] = owner_email if not is_owner else None

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
    "/trips/{trip_id}/budget-status/",
    response_model=schemas.BudgetStatusResponse,
    tags=["trips"],
)
def get_budget_status(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get budget status with progress, category breakdown, and alerts."""
    get_trip_or_404(trip_id, db, current_user)  # Check access
    result = svc_get_budget_status(trip_id, db)
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


@router.get(
    "/trips/{trip_id}/stats/",
    response_model=schemas.TripStats,
    tags=["trips"],
)
def get_trip_stats(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get comprehensive statistics for a trip."""
    trip = get_trip_or_404(trip_id, db, current_user)

    # Calculate days until departure
    today = date.today()
    days_until_departure = None
    if trip.start_date >= today:
        days_until_departure = (trip.start_date - today).days

    # Calculate trip duration
    duration_days = (trip.end_date - trip.start_date).days + 1

    # Count destinations
    destination_count = (
        db.query(func.count(models.Destination.id))
        .filter(models.Destination.trip_id == trip_id)
        .scalar()
        or 0
    )

    # Count and sum journeys
    journey_stats = (
        db.query(
            func.count(models.Journey.id),
            func.coalesce(func.sum(models.Journey.cost), 0),
            func.sum(case((models.Journey.status == "booked", 1), else_=0)),
        )
        .filter(models.Journey.trip_id == trip_id)
        .first()
    )
    journey_count = journey_stats[0] or 0
    journey_cost = Decimal(str(journey_stats[1] or 0))
    booked_journeys = journey_stats[2] or 0

    # Get activity count (through destinations)
    activity_count = (
        db.query(func.count(models.Activity.id))
        .join(
            models.Destination, models.Activity.destination_id == models.Destination.id
        )
        .filter(models.Destination.trip_id == trip_id)
        .scalar()
        or 0
    )

    # Count and sum expenses
    expense_stats = (
        db.query(
            func.count(models.Expense.id),
            func.coalesce(func.sum(models.Expense.amount), 0),
        )
        .filter(models.Expense.trip_id == trip_id)
        .first()
    )
    expense_count = expense_stats[0] or 0
    expense_cost = Decimal(str(expense_stats[1] or 0))

    # Packing items stats
    packing_stats = (
        db.query(
            func.count(models.PackingItem.id),
            func.sum(case((models.PackingItem.is_packed.is_(True), 1), else_=0)),
        )
        .filter(models.PackingItem.trip_id == trip_id)
        .first()
    )
    total_packing_items = packing_stats[0] or 0
    packed_items = packing_stats[1] or 0

    # Calculate total cost
    total_cost = journey_cost + expense_cost

    # Calculate completion percentage (based on booked journeys)
    completion_percentage = 0.0
    if journey_count > 0:
        completion_percentage = (booked_journeys / journey_count) * 100

    return schemas.TripStats(
        total_cost=total_cost,
        journey_cost=journey_cost,
        expense_cost=expense_cost,
        days_until_departure=days_until_departure,
        duration_days=duration_days,
        completion_percentage=round(completion_percentage, 1),
        booked_journeys=booked_journeys,
        total_journeys=journey_count,
        packed_items=packed_items,
        total_packing_items=total_packing_items,
        counts=schemas.TripStatsCounts(
            destinations=destination_count,
            journeys=journey_count,
            activities=activity_count,
            expenses=expense_count,
            packing_items=total_packing_items,
        ),
    )


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

    # Single query with JOIN to avoid N+1 problem
    shares_with_users = (
        db.query(models.TripShare, models.User.email)
        .join(models.User, models.TripShare.user_id == models.User.id)
        .filter(models.TripShare.trip_id == trip_id)
        .all()
    )

    return [
        schemas.TripShareResponse.from_orm_with_email(share, email)
        for share, email in shares_with_users
    ]


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
