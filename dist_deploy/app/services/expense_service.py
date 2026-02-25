"""
app/services/expense_service.py - Expense summary + segment expense helpers

Author: Travel Planner Team
"""

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app import models


def get_expense_summary(trip_id: int, db: Session) -> Optional[Dict]:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    expenses = db.query(models.Expense).filter(models.Expense.trip_id == trip_id).all()

    total = sum(float(e.amount) for e in expenses)
    paid_total = sum(float(e.amount) for e in expenses if e.paid)

    by_category: dict[str, float] = {}
    for e in expenses:
        cat = e.category or "other"
        by_category[cat] = by_category.get(cat, 0) + float(e.amount)

    return {
        "total": round(total, 2),
        "paid_total": round(paid_total, 2),
        "unpaid_total": round(total - paid_total, 2),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "count": len(expenses),
    }


def upsert_segment_expense(
    segment_id: int,
    trip_id: int,
    amount: Decimal,
    currency: str,
    description: str,
    expense_date: date,
    booked: bool,
    paid: bool,
    db: Session,
) -> models.Expense:
    """
    Creates or updates the single auto-expense linked to this segment.
    One segment → at most one auto-expense (keyed by segment_id).
    User-created manual expenses on the segment are separate records.
    """
    existing = (
        db.query(models.Expense).filter(models.Expense.segment_id == segment_id).first()
    )

    if existing:
        existing.amount = amount
        existing.currency = currency
        existing.description = description
        existing.date = expense_date
        existing.booked = booked
        existing.paid = paid
        db.commit()
        db.refresh(existing)
        return existing

    expense = models.Expense(
        trip_id=trip_id,
        segment_id=segment_id,
        category="transport",
        amount=amount,
        currency=currency,
        description=description,
        date=expense_date,
        booked=booked,
        paid=paid,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def delete_segment_expense(segment_id: int, db: Session) -> None:
    """Remove the auto-expense for this segment (called when cost is cleared to 0)."""
    db.query(models.Expense).filter(models.Expense.segment_id == segment_id).delete()
    db.commit()


def _parse_cost(raw) -> Optional[Decimal]:
    """Safely parse a cost value from segment metadata."""
    if raw is None or raw == "" or raw == 0:
        return None
    try:
        value = Decimal(str(raw))
        return value if value > 0 else None
    except InvalidOperation:
        return None


def _expense_date_from_segment(segment: models.JourneySegment) -> date:
    """Extract the expense date from a segment's start_datetime, defaulting to today."""
    if segment.start_datetime:
        dt = segment.start_datetime
        if isinstance(dt, datetime):
            return dt.date()
        if isinstance(dt, date):
            return dt
    return date.today()


def sync_segment_expense(segment: models.JourneySegment, db: Session) -> None:
    """
    Called after every segment create/update.
    Reads cost/currency/booked/paid from segment.metadata_json and
    upserts or deletes the linked Expense record accordingly.
    """
    import json

    metadata: dict = {}
    if segment.metadata_json:
        try:
            raw = segment.metadata_json
            metadata = json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            metadata = {}

    cost = _parse_cost(metadata.get("cost"))

    if cost is None:
        # Cost cleared or never set — remove any existing auto-expense
        delete_segment_expense(segment.id, db)
        return

    # Fetch trip_id via the journey
    journey = (
        db.query(models.Journey).filter(models.Journey.id == segment.journey_id).first()
    )
    if not journey:
        return

    currency = str(metadata.get("currency") or "USD")
    booked = bool(metadata.get("booked", False))
    paid = bool(metadata.get("paid", False))

    origin = segment.origin_name or ""
    destination = segment.destination_name or ""
    seg_type = (segment.segment_type or "transport").title()
    description = f"{seg_type}"
    if origin or destination:
        description += (
            f" — {origin} → {destination}"
            if origin and destination
            else f" — {origin or destination}"
        )

    upsert_segment_expense(
        segment_id=segment.id,
        trip_id=journey.trip_id,
        amount=cost,
        currency=currency,
        description=description,
        expense_date=_expense_date_from_segment(segment),
        booked=booked,
        paid=paid,
        db=db,
    )
