"""
app/routers/trips.py - Trip endpoints router

CRUD endpoints and trip-level aggregates for trips.
All endpoints require authentication.

Author: Travel Planner Team
"""

import logging
from datetime import date
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, text
from sqlalchemy.orm import Session

from app import models, schemas
from app.core import email_config
from app.core.deps import get_current_user
from app.services.activity_service import (
    get_destinations_with_activities as svc_get_destinations_with_activities,
    get_trip_progress as svc_get_trip_progress,
)
from app.services.budget_service import get_budget_status as svc_get_budget_status
from app.services.exchange_rate import convert
from app.services.expense_service import get_expense_summary as svc_get_expense_summary
from app.services.timeline_service import (
    get_accommodation_expenses as svc_get_accommodation_expenses,
)
from app.services.email_service import send_trip_share_email
from database import get_db

logger = logging.getLogger(__name__)

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

    # Fetch summary counts for all relevant trip IDs in one query
    all_trip_ids = [t.id for t in owned_trips] + [t.id for t, _ in shared_trip_data]
    summary_map: dict[int, dict] = {}
    if all_trip_ids:
        # Expand IDs inline (safe — all are ints from the DB)
        ids_csv = ",".join(str(i) for i in all_trip_ids)
        rows = db.execute(
            text(
                f"SELECT id, day_count, total_spent, budget_remaining"
                f" FROM trip_summary WHERE id IN ({ids_csv})"
            )
        ).fetchall()
        for row in rows:
            summary_map[row[0]] = {
                "day_count": row[1] or 0,
                "total_spent": Decimal(str(row[2] or 0)),
                "budget_remaining": Decimal(str(row[3]))
                if row[3] is not None
                else None,
            }

    def _enrich(
        trip_dict: dict, is_owner: bool, shared_by: str | None
    ) -> schemas.TripWithOwnership:
        summary = summary_map.get(trip_dict["id"], {})
        return schemas.TripWithOwnership(
            **trip_dict,
            is_owner=is_owner,
            shared_by=shared_by,
            day_count=summary.get("day_count", 0),
            total_spent=summary.get("total_spent", Decimal("0")),
            budget_remaining=summary.get("budget_remaining"),
        )

    # Build result with ownership info
    result = []
    for trip in owned_trips:
        trip_dict = schemas.Trip.model_validate(trip).model_dump()
        result.append(_enrich(trip_dict, is_owner=True, shared_by=None))

    for trip, owner_email in shared_trip_data:
        trip_dict = schemas.Trip.model_validate(trip).model_dump()
        result.append(_enrich(trip_dict, is_owner=False, shared_by=owner_email))

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
    trip = get_trip_or_404(trip_id, db, current_user)
    result = svc_get_budget_status(
        trip_id,
        db,
        warning_threshold=trip.budget_warning_threshold or 75,
        danger_threshold=trip.budget_danger_threshold or 90,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.post("/trips/{trip_id}/rebase-currency/", tags=["trips"])
def rebase_currency(
    trip_id: int,
    payload: schemas.RebaseCurrencyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Batch-recalculate all expenses for a new base currency."""
    trip = get_trip_or_404(trip_id, db, current_user)
    new_currency = payload.new_currency

    expenses = db.query(models.Expense).filter(models.Expense.trip_id == trip_id).all()

    updated = 0
    failed_ids = []

    for expense in expenses:
        result = convert(
            Decimal(str(expense.amount)),
            expense.currency or "USD",
            new_currency,
        )
        if result is None:
            failed_ids.append(expense.id)
            continue

        expense.exchange_rate = result[0]
        expense.base_amount = result[1]
        updated += 1

    trip.default_currency = new_currency
    db.commit()

    return {
        "new_currency": new_currency,
        "updated_count": updated,
        "failed_count": len(failed_ids),
        "failed_expense_ids": failed_ids,
    }


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

    # Count and sum transports
    transport_stats = (
        db.query(
            func.count(models.TripTransport.id),
            func.coalesce(func.sum(models.TripTransport.cost), 0),
            func.sum(case((models.TripTransport.booked.is_(True), 1), else_=0)),
        )
        .filter(models.TripTransport.trip_id == trip_id)
        .first()
    )
    transport_count = transport_stats[0] or 0
    transport_cost = Decimal(str(transport_stats[1] or 0))
    booked_transports = transport_stats[2] or 0

    # Get activity count (via day or destination)
    activity_count_via_day = (
        db.query(func.count(models.DayActivity.id))
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(models.TripDay.trip_id == trip_id)
        .scalar()
        or 0
    )
    activity_count_via_dest = (
        db.query(func.count(models.DayActivity.id))
        .join(
            models.Destination,
            models.DayActivity.destination_id == models.Destination.id,
        )
        .filter(models.Destination.trip_id == trip_id)
        .filter(models.DayActivity.day_id.is_(None))
        .scalar()
        or 0
    )
    activity_count = activity_count_via_day + activity_count_via_dest

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
    total_cost = transport_cost + expense_cost

    # Calculate completion percentage (based on booked transports)
    completion_percentage = 0.0
    if transport_count > 0:
        completion_percentage = (booked_transports / transport_count) * 100

    return schemas.TripStats(
        total_cost=total_cost,
        transport_cost=transport_cost,
        expense_cost=expense_cost,
        days_until_departure=days_until_departure,
        duration_days=duration_days,
        completion_percentage=round(completion_percentage, 1),
        booked_transports=booked_transports,
        total_transports=transport_count,
        packed_items=packed_items,
        total_packing_items=total_packing_items,
        counts=schemas.TripStatsCounts(
            destinations=destination_count,
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
    trip = get_trip_or_404(trip_id, db, current_user, require_owner=True)

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

    # Send share notification email — swallow failures, share is already persisted
    try:
        send_trip_share_email(
            to_email=user.email,
            trip_name=trip.name,
            shared_by=current_user.email,
            trip_url=f"{email_config.FRONTEND_URL}/trips/{trip_id}",
        )
    except Exception as e:
        logger.error("Failed to send trip share email to %s: %s", user.email, e)

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
