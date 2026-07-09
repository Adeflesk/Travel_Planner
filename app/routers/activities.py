"""
app/routers/activities.py - Unified activity endpoints

All CRUD for DayActivity (day-linked and/or destination-linked).
"""

import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.geocoding import geocode
from app.services.schedule_service import (
    compute_schedule,
    activities_to_schedule_items,
)
from app.schemas.transport_stop import (
    ScheduleItemOut,
    ScheduleResponse,
    ScheduleWarningOut,
)
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


def _sync_activity_expense(
    activity: models.DayActivity,
    db: Session,
    trip_id: int,
    activity_date: Optional[datetime.date],
) -> None:
    """
    Keep the Expense table in sync with the activity's cost field.

    - cost > 0  → upsert a linked Expense row
    - cost is None / 0 → delete any existing linked Expense row

    The expense is stored in the `activity` category so it shows up
    correctly in budget breakdowns. The currency falls back to the
    trip's default_currency, then USD.
    """
    has_cost = activity.cost is not None and activity.cost > 0

    # Find any existing expense already linked to this activity
    existing: Optional[models.Expense] = (
        db.query(models.Expense)
        .filter(models.Expense.activity_id == activity.id)
        .first()
    )

    if has_cost:
        trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
        currency = (
            activity.currency or (trip.default_currency if trip else None) or "USD"
        )
        expense_date = activity_date or datetime.date.today()
        expense_category = activity.category or "activity"

        cost_decimal = Decimal(str(activity.cost))
        if existing:
            # Update in place
            existing.amount = cost_decimal
            existing.base_amount = cost_decimal
            existing.exchange_rate = Decimal("1.0")
            existing.currency = currency
            existing.category = expense_category
            existing.description = activity.title
            existing.booked = activity.booked
            if activity_date:
                existing.date = activity_date
        else:
            new_expense = models.Expense(
                trip_id=trip_id,
                activity_id=activity.id,
                category=expense_category,
                amount=cost_decimal,
                base_amount=cost_decimal,
                exchange_rate=Decimal("1.0"),
                currency=currency,
                description=activity.title,
                date=expense_date,
                booked=activity.booked,
            )
            db.add(new_expense)
    else:
        # No cost — remove stale expense if one exists
        if existing:
            db.delete(existing)


def _resolve_trip_and_date(
    activity: models.DayActivity,
    db: Session,
) -> tuple[Optional[int], Optional[datetime.date]]:
    """
    Walk the day → trip or destination → trip chain and return
    (trip_id, date_for_expense).
    """
    if activity.day_id:
        day = (
            db.query(models.TripDay)
            .filter(models.TripDay.id == activity.day_id)
            .first()
        )
        if day:
            return day.trip_id, day.date
    if activity.destination_id:
        dest = (
            db.query(models.Destination)
            .filter(models.Destination.id == activity.destination_id)
            .first()
        )
        if dest:
            return dest.trip_id, None
    return None, None


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

    # Sync expense for the new activity's cost
    if db_activity.cost:
        trip_id_sync, activity_date = _resolve_trip_and_date(db_activity, db)
        if trip_id_sync:
            _sync_activity_expense(db_activity, db, trip_id_sync, activity_date)
            db.commit()

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

    # Sync expense: cost may have changed, been added, or been removed
    trip_id_sync, activity_date = _resolve_trip_and_date(activity, db)
    if trip_id_sync:
        _sync_activity_expense(activity, db, trip_id_sync, activity_date)
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


# ---------------------------------------------------------------------------
# Schedule (computed, never persisted) — Phase 2
# ---------------------------------------------------------------------------


@router.get(
    "/trip-days/{day_id}/schedule",
    response_model=ScheduleResponse,
)
def get_day_schedule(
    day_id: int,
    departure_time: str = Query(..., description="HH:MM departure time"),
    day_date: str = Query(..., description="YYYY-MM-DD date"),
    day_end_target: str | None = Query(None, description="HH:MM target end"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Cascade-schedule activities for a day, reusing the same algorithm
    as the transport-stop scheduler."""
    day = db.query(models.TripDay).filter(models.TripDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    _require_trip_access(day.trip_id, db, current_user)

    orm_activities = (
        db.query(models.DayActivity)
        .filter(models.DayActivity.day_id == day_id)
        .order_by(models.DayActivity.sort_order)
        .all()
    )

    schedule_items = activities_to_schedule_items(orm_activities)

    # Default timezone: first activity's tz → trip tz → UTC
    default_tz = "UTC"
    if schedule_items and schedule_items[0].timezone:
        default_tz = schedule_items[0].timezone
    else:
        trip = db.query(models.Trip).filter(models.Trip.id == day.trip_id).first()
        if trip and trip.timezone:
            default_tz = trip.timezone

    # Sunset coords: use last activity with coords
    sunset_coords = None
    for a in reversed(orm_activities):
        if a.latitude is not None and a.longitude is not None:
            sunset_coords = (a.latitude, a.longitude)
            break

    parsed_date = datetime.date.fromisoformat(day_date)

    result = compute_schedule(
        stops=schedule_items,
        departure_time=departure_time,
        day_date=parsed_date,
        default_timezone=default_tz,
        day_end_target=day_end_target,
        sunset_coords=sunset_coords,
    )

    return ScheduleResponse(
        items=[
            ScheduleItemOut(
                id=item.id,
                title=item.title,
                arrival_local=item.arrival_local,
                departure_local=item.departure_local,
                timezone=item.timezone,
                duration_minutes=item.duration_minutes,
                drive_minutes_from_previous=item.drive_minutes_from_previous,
                slack_before_minutes=item.slack_before_minutes,
                overrun_minutes=item.overrun_minutes,
            )
            for item in result.items
        ],
        warnings=[
            ScheduleWarningOut(
                code=w.code,
                stop_id=w.stop_id,
                message=w.message,
            )
            for w in result.warnings
        ],
        day_start=result.day_start.isoformat() if result.day_start else None,
        day_end=result.day_end.isoformat() if result.day_end else None,
        sunset=result.sunset.isoformat() if result.sunset else None,
    )
