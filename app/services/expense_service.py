"""
app/services/expense_service.py - Expense summary service

Extracted business logic for computing expense summaries.

Author: Travel Planner Team
"""

from typing import Dict
from sqlalchemy.orm import Session
import models


def get_expense_summary(trip_id: int, db: Session) -> Dict:
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
