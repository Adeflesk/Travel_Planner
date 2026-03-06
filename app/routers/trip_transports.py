import datetime
from decimal import Decimal
from typing import Optional
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app import models
from app.core.deps import get_current_user
from app.schemas.trip_transport import (
    TripTransportCreate,
    TripTransportUpdate,
    TripTransportRead,
)
from database import get_db

router = APIRouter()


def _sync_transport_expense(
    transport: models.TripTransport,
    db: Session,
) -> None:
    """
    Keep the Expense table in sync with the transport's cost field.

    - cost > 0  → upsert a linked Expense row (transport_id FK used for lookup)
    - cost is None / 0 → delete any existing linked Expense row

    The expense category is the transport_type (e.g. "flight", "train").
    The date comes from the departure day; falls back to today.
    """
    has_cost = transport.cost is not None and transport.cost > 0

    existing: Optional[models.Expense] = (
        db.query(models.Expense)
        .filter(models.Expense.transport_id == transport.id)
        .first()
    )

    if has_cost:
        trip = db.query(models.Trip).filter(models.Trip.id == transport.trip_id).first()
        currency = (
            transport.currency or (trip.default_currency if trip else None) or "USD"
        )

        # Use departure day's date if available
        expense_date: datetime.date = datetime.date.today()
        if transport.departure_day_id:
            dep_day = (
                db.query(models.TripDay)
                .filter(models.TripDay.id == transport.departure_day_id)
                .first()
            )
            if dep_day:
                expense_date = dep_day.date

        description = f"{transport.origin} → {transport.destination}"
        if transport.carrier:
            description = f"{transport.carrier}: {description}"

        if existing:
            existing.amount = Decimal(str(transport.cost))
            existing.currency = currency
            existing.category = transport.transport_type
            existing.description = description
            existing.booked = transport.booked
            existing.date = expense_date
        else:
            new_expense = models.Expense(
                trip_id=transport.trip_id,
                transport_id=transport.id,
                category=transport.transport_type,
                amount=Decimal(str(transport.cost)),
                currency=currency,
                description=description,
                date=expense_date,
                booked=transport.booked,
            )
            db.add(new_expense)
    else:
        if existing:
            db.delete(existing)


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


def _check_transport_access(
    transport_id: int,
    db: Session,
    current_user: models.User,
    require_owner: bool = False,
) -> models.TripTransport:
    transport = (
        db.query(models.TripTransport)
        .options(selectinload(models.TripTransport.options))
        .filter(models.TripTransport.id == transport_id)
        .first()
    )
    if not transport:
        raise HTTPException(status_code=404, detail="Transport not found")
    _check_trip_access(transport.trip_id, db, current_user, require_owner)
    return transport


@router.get(
    "/trips/{trip_id}/transport",
    response_model=List[TripTransportRead],
)
def list_trip_transport(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    items = (
        db.query(models.TripTransport)
        .options(selectinload(models.TripTransport.options))
        .filter(models.TripTransport.trip_id == trip_id)
        .order_by(models.TripTransport.sort_order)
        .all()
    )
    return items


@router.post(
    "/trips/{trip_id}/transport",
    response_model=TripTransportRead,
    status_code=201,
)
def create_transport(
    trip_id: int,
    data: TripTransportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user, require_owner=True)
    item = models.TripTransport(trip_id=trip_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    # Sync expense for the new transport's cost
    if item.cost:
        _sync_transport_expense(item, db)
        db.commit()

    # Reload with options
    return (
        db.query(models.TripTransport)
        .options(selectinload(models.TripTransport.options))
        .filter(models.TripTransport.id == item.id)
        .first()
    )


@router.get(
    "/trips/{trip_id}/transport/day/{day_id}",
    response_model=List[TripTransportRead],
)
def list_day_transport(
    trip_id: int,
    day_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    items = (
        db.query(models.TripTransport)
        .options(selectinload(models.TripTransport.options))
        .filter(
            models.TripTransport.trip_id == trip_id,
            or_(
                models.TripTransport.departure_day_id == day_id,
                models.TripTransport.arrival_day_id == day_id,
            ),
        )
        .order_by(models.TripTransport.sort_order)
        .all()
    )
    return items


@router.get(
    "/transport/{transport_id}",
    response_model=TripTransportRead,
)
def get_transport(
    transport_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _check_transport_access(transport_id, db, current_user)


@router.put(
    "/transport/{transport_id}",
    response_model=TripTransportRead,
)
def update_transport(
    transport_id: int,
    data: TripTransportUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _check_transport_access(transport_id, db, current_user, require_owner=True)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)

    # Sync expense: cost/booked/route may have changed
    _sync_transport_expense(item, db)
    db.commit()

    return (
        db.query(models.TripTransport)
        .options(selectinload(models.TripTransport.options))
        .filter(models.TripTransport.id == item.id)
        .first()
    )


@router.delete("/transport/{transport_id}", status_code=204)
def delete_transport(
    transport_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _check_transport_access(transport_id, db, current_user, require_owner=True)
    db.delete(item)
    db.commit()
