"""
Accommodation CRUD service with expense auto-sync.

When an accommodation has cost > 0, a linked Expense is automatically
created/updated (category='accommodation'). When cost is cleared or the
accommodation is deleted, the linked expense is removed.

The expense link is tracked via Expense.accommodation_id (same pattern
as Expense.transport_id for TripTransport).
"""
from decimal import Decimal
from sqlalchemy.orm import Session

from app import models, schemas


def _sync_expense(db: Session, accommodation: models.Accommodation) -> None:
    """Create, update, or delete the linked expense based on cost."""
    has_cost = accommodation.cost is not None and accommodation.cost > 0

    # Find any existing linked expense
    existing = (
        db.query(models.Expense)
        .filter(models.Expense.accommodation_id == accommodation.id)
        .first()
    )

    if has_cost:
        currency = accommodation.currency or "USD"
        if existing:
            existing.amount = Decimal(str(accommodation.cost))
            existing.currency = currency
            existing.description = accommodation.name
            existing.date = accommodation.check_in_date
            existing.booked = accommodation.booked
            existing.paid = accommodation.paid
        else:
            expense = models.Expense(
                trip_id=accommodation.trip_id,
                destination_id=accommodation.destination_id,
                accommodation_id=accommodation.id,
                category="accommodation",
                amount=Decimal(str(accommodation.cost)),
                currency=currency,
                description=accommodation.name,
                date=accommodation.check_in_date,
                booked=accommodation.booked,
                paid=accommodation.paid,
            )
            db.add(expense)
    else:
        if existing:
            db.delete(existing)

    db.flush()


def create_accommodation(
    db: Session, data: schemas.AccommodationCreate
) -> models.Accommodation:
    accommodation = models.Accommodation(**data.model_dump())
    db.add(accommodation)
    db.flush()
    _sync_expense(db, accommodation)
    db.commit()
    db.refresh(accommodation)
    return accommodation


def get_accommodations_by_destination(
    db: Session, destination_id: int
) -> list[models.Accommodation]:
    return (
        db.query(models.Accommodation)
        .filter(models.Accommodation.destination_id == destination_id)
        .order_by(models.Accommodation.check_in_date)
        .all()
    )


def get_accommodations_by_trip(db: Session, trip_id: int) -> list[models.Accommodation]:
    return (
        db.query(models.Accommodation)
        .filter(models.Accommodation.trip_id == trip_id)
        .order_by(models.Accommodation.check_in_date)
        .all()
    )


def update_accommodation(
    db: Session,
    accommodation: models.Accommodation,
    data: schemas.AccommodationUpdate,
) -> models.Accommodation:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(accommodation, key, value)
    db.flush()
    _sync_expense(db, accommodation)
    db.commit()
    db.refresh(accommodation)
    return accommodation


def delete_accommodation(db: Session, accommodation: models.Accommodation) -> None:
    # Linked expense is cascade-deleted via accommodation_id FK (SET NULL won't do it)
    # So delete it explicitly first
    existing = (
        db.query(models.Expense)
        .filter(models.Expense.accommodation_id == accommodation.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.flush()
    db.delete(accommodation)
    db.commit()
