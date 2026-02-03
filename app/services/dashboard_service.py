"""
app/services/dashboard_service.py - Dashboard aggregation service

Provides dashboard summary data and action items.

Author: Travel Planner Team
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.budget_service import get_budget_status as svc_get_budget_status


def _to_float(value: Optional[Decimal]) -> float:
    if value is None:
        return 0.0
    return float(value)


def _urgency_from_days(days: Optional[int]) -> schemas.ActionItemUrgency:
    if days is None:
        return "medium"
    if days <= 7:
        return "high"
    if days <= 21:
        return "medium"
    return "low"


def _get_accessible_trip_ids(db: Session, user_id: int) -> List[int]:
    owned = db.query(models.Trip.id).filter(models.Trip.user_id == user_id).all()
    shared = (
        db.query(models.TripShare.trip_id)
        .filter(models.TripShare.user_id == user_id)
        .all()
    )
    ids = {trip_id for (trip_id,) in owned}
    ids.update(trip_id for (trip_id,) in shared)
    return list(ids)


def _get_destinations_for_trip(db: Session, trip_id: int) -> List[str]:
    return [
        d.name
        for d in (
            db.query(models.Destination)
            .filter(models.Destination.trip_id == trip_id)
            .order_by(models.Destination.order)
            .all()
        )
    ]


def _get_trip_expense_total(db: Session, trip_id: int) -> float:
    total = (
        db.query(func.sum(models.Expense.amount))
        .filter(models.Expense.trip_id == trip_id)
        .scalar()
    )
    return _to_float(total)


def _get_action_items_for_trip(
    db: Session, trip: models.Trip
) -> List[schemas.DashboardActionItem]:
    items: List[schemas.DashboardActionItem] = []
    today = date.today()

    days_until_start = (trip.start_date - today).days
    trip_urgency = _urgency_from_days(days_until_start)

    # Booking: journeys not booked
    unbooked_journeys = (
        db.query(models.Journey)
        .filter(models.Journey.trip_id == trip.id, models.Journey.status != "booked")
        .all()
    )
    for journey in unbooked_journeys:
        days_until_departure = None
        if journey.departure_datetime:
            days_until_departure = (journey.departure_datetime.date() - today).days
        urgency = _urgency_from_days(days_until_departure or days_until_start)
        items.append(
            schemas.DashboardActionItem(
                type="booking",
                title="Book transportation",
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=urgency,
                detail=f"{journey.transport_mode.title()} not booked",
            )
        )

    # Packing: items not packed
    total_items = (
        db.query(func.count(models.PackingItem.id))
        .filter(models.PackingItem.trip_id == trip.id)
        .scalar()
        or 0
    )
    packed_items = (
        db.query(func.count(models.PackingItem.id))
        .filter(
            models.PackingItem.trip_id == trip.id,
            models.PackingItem.is_packed.is_(True),
        )
        .scalar()
        or 0
    )
    if total_items > 0 and packed_items < total_items:
        items.append(
            schemas.DashboardActionItem(
                type="packing",
                title="Start packing",
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=trip_urgency,
                detail=f"{packed_items}/{total_items} items packed",
            )
        )

    # Budget alerts
    budget_status = svc_get_budget_status(trip.id, db)
    if budget_status and budget_status.status in {"warning", "danger", "over"}:
        urgency: schemas.ActionItemUrgency = "medium"
        if budget_status.status in {"danger", "over"}:
            urgency = "high"
        items.append(
            schemas.DashboardActionItem(
                type="budget",
                title="Review budget",
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=urgency,
                detail=f"{budget_status.percentage_used}% of budget used",
            )
        )

    # Deadline: expenses with upcoming cancel-by date
    deadline_window = today + timedelta(days=7)
    deadline_expense = (
        db.query(models.Expense)
        .filter(
            models.Expense.trip_id == trip.id,
            models.Expense.cancel_by_date.isnot(None),
            models.Expense.cancel_by_date >= today,
            models.Expense.cancel_by_date <= deadline_window,
        )
        .order_by(models.Expense.cancel_by_date)
        .first()
    )
    if deadline_expense:
        days_until_deadline = (deadline_expense.cancel_by_date - today).days
        urgency = "high" if days_until_deadline <= 3 else "medium"
        items.append(
            schemas.DashboardActionItem(
                type="deadline",
                title="Cancellation deadline",
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=urgency,
                detail=f"Cancel by {deadline_expense.cancel_by_date.isoformat()}",
            )
        )

    return items


def get_dashboard_data(db: Session, current_user: models.User) -> schemas.DashboardData:
    today = date.today()
    trip_ids = _get_accessible_trip_ids(db, current_user.id)

    if trip_ids:
        trips = (
            db.query(models.Trip)
            .filter(models.Trip.id.in_(trip_ids))
            .order_by(models.Trip.start_date)
            .all()
        )
    else:
        trips = []

    # Next trip
    next_trip: Optional[schemas.DashboardNextTrip] = None
    upcoming = [
        trip
        for trip in trips
        if trip.start_date >= today and trip.status != "cancelled"
    ]
    if upcoming:
        next_trip_model = sorted(upcoming, key=lambda t: t.start_date)[0]
        days_until = (next_trip_model.start_date - today).days
        next_trip = schemas.DashboardNextTrip(
            id=next_trip_model.id,
            name=next_trip_model.name,
            start_date=next_trip_model.start_date.isoformat(),
            days_until=days_until,
            destinations=_get_destinations_for_trip(db, next_trip_model.id),
            budget_used=_get_trip_expense_total(db, next_trip_model.id),
            budget_total=_to_float(next_trip_model.budget),
        )

    # Stats
    total_trips = len(trips)
    upcoming_trips = sum(1 for trip in trips if trip.start_date >= today)
    countries_visited = 0
    if trip_ids:
        countries_visited = (
            db.query(func.count(distinct(models.Destination.country)))
            .filter(
                models.Destination.trip_id.in_(trip_ids),
                models.Destination.country.isnot(None),
                models.Destination.country != "",
            )
            .scalar()
            or 0
        )

    year_start = date(today.year, 1, 1)
    year_end = date(today.year, 12, 31)
    spent_this_year = 0.0
    if trip_ids:
        spent_this_year = _to_float(
            db.query(func.sum(models.Expense.amount))
            .filter(
                models.Expense.trip_id.in_(trip_ids),
                models.Expense.date >= year_start,
                models.Expense.date <= year_end,
            )
            .scalar()
        )

    stats = schemas.DashboardStats(
        total_trips=total_trips,
        countries_visited=int(countries_visited),
        spent_this_year=spent_this_year,
        upcoming_trips=upcoming_trips,
    )

    # Action items
    action_items: List[schemas.DashboardActionItem] = []
    for trip in upcoming:
        action_items.extend(_get_action_items_for_trip(db, trip))

    urgency_rank: Dict[schemas.ActionItemUrgency, int] = {
        "high": 3,
        "medium": 2,
        "low": 1,
    }
    action_items.sort(
        key=lambda item: (urgency_rank[item.urgency], item.trip_id), reverse=True
    )
    action_items = action_items[:10]

    # Recent trips
    recent_trips: List[schemas.DashboardRecentTrip] = []
    recent_source = sorted(trips, key=lambda t: t.end_date, reverse=True)[:6]
    for trip in recent_source:
        status = "completed" if trip.status == "completed" else "in_progress"
        recent_trips.append(
            schemas.DashboardRecentTrip(
                id=trip.id,
                name=trip.name,
                dates=f"{trip.start_date.isoformat()} - {trip.end_date.isoformat()}",
                status=status,
                country_code=None,
            )
        )

    user_name = current_user.full_name or current_user.email

    return schemas.DashboardData(
        user=schemas.DashboardUser(name=user_name),
        next_trip=next_trip,
        stats=stats,
        action_items=action_items,
        recent_trips=recent_trips,
    )
