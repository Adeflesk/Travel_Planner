"""
app/routers/packing.py - Packing endpoints router

CRUD and trip-scoped packing endpoints and summary.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db
from app.services.packing_service import get_packing_summary as svc_get_packing_summary

router = APIRouter()


@router.post(
    "/packing-items/",
    response_model=schemas.PackingItem,
    status_code=201,
    tags=["packing"],
)
def create_packing_item(item: schemas.PackingItemCreate, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == item.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db_item = models.PackingItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get(
    "/trips/{trip_id}/packing-items/",
    response_model=List[schemas.PackingItem],
    tags=["packing"],
)
def get_trip_packing_items(trip_id: int, db: Session = Depends(get_db)):
    items = (
        db.query(models.PackingItem)
        .filter(models.PackingItem.trip_id == trip_id)
        .order_by(models.PackingItem.category)
        .all()
    )
    return items


@router.put(
    "/packing-items/{item_id}", response_model=schemas.PackingItem, tags=["packing"]
)
def update_packing_item(
    item_id: int, item_update: schemas.PackingItemUpdate, db: Session = Depends(get_db)
):
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/packing-items/{item_id}", status_code=204, tags=["packing"])
def delete_packing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    db.delete(item)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/packing/summary/",
    response_model=schemas.PackingSummary,
    tags=["packing"],
)
def get_packing_summary(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_packing_summary(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result
