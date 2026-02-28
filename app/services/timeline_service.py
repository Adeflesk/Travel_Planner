"""
app/services/timeline_service.py - Accommodation expense grouping service
"""

from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app import models


def get_accommodation_expenses(trip_id: int, db: Session) -> Optional[List[Dict]]:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    accommodation_expenses = (
        db.query(models.Expense)
        .filter(
            models.Expense.trip_id == trip_id,
            models.Expense.category == "accommodation",
        )
        .all()
    )

    result = []
    for dest in destinations:
        dest_expenses = []
        for exp in accommodation_expenses:
            if exp.destination_id == dest.id:
                dest_expenses.append(exp)
            elif (
                exp.destination_id is None and dest.arrival_date and dest.departure_date
            ):
                if dest.arrival_date <= exp.date < dest.departure_date:
                    dest_expenses.append(exp)

        total = sum(float(e.amount) for e in dest_expenses)
        result.append(
            {"destination": dest, "expenses": dest_expenses, "total": round(total, 2)}
        )

    return result
