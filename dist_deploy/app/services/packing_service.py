"""
app/services/packing_service.py - Packing summary service

Extracted business logic for computing packing summaries.

Author: Travel Planner Team
"""

from typing import Dict
from sqlalchemy.orm import Session
import models


def get_packing_summary(trip_id: int, db: Session) -> Dict:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    items = (
        db.query(models.PackingItem)
        .filter(models.PackingItem.trip_id == trip_id)
        .order_by(models.PackingItem.category)
        .all()
    )

    total_items = len(items)
    packed_items = sum(1 for item in items if item.is_packed)
    progress_percent = round(packed_items / total_items * 100) if total_items > 0 else 0

    by_category: dict[str, dict] = {}
    for item in items:
        cat = item.category or "other"
        if cat not in by_category:
            by_category[cat] = {"total": 0, "packed": 0, "items": []}
        by_category[cat]["total"] += 1
        if item.is_packed:
            by_category[cat]["packed"] += 1
        by_category[cat]["items"].append(item)

    return {
        "total_items": total_items,
        "packed_items": packed_items,
        "progress_percent": progress_percent,
        "by_category": by_category,
    }
