"""
app/routers/activities.py - Activity endpoints router

CRUD and destination-scoped activity endpoints.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db

router = APIRouter()


@router.post(
    "/activities/",
    response_model=schemas.Activity,
    status_code=201,
    tags=["activities"],
)
def create_activity(activity: schemas.ActivityCreate, db: Session = Depends(get_db)):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == activity.destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    db_activity = models.Activity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


@router.get(
    "/destinations/{destination_id}/activities/",
    response_model=List[schemas.Activity],
    tags=["activities"],
)
def get_destination_activities(destination_id: int, db: Session = Depends(get_db)):
    activities = (
        db.query(models.Activity)
        .filter(models.Activity.destination_id == destination_id)
        .order_by(models.Activity.scheduled_date, models.Activity.scheduled_time)
        .all()
    )
    return activities


@router.put(
    "/activities/{activity_id}", response_model=schemas.Activity, tags=["activities"]
)
def update_activity(
    activity_id: int,
    activity_update: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
):
    activity = (
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    for key, value in activity_update.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=204, tags=["activities"])
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = (
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return None
