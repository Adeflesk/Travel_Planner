from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.core.trip_access import TripAccess, get_trip_with_access
from database import get_db

router = APIRouter(tags=["pre-trip-tasks"])


def _get_task_or_404(task_id: int, db: Session) -> models.PreTripTask:
    task = db.query(models.PreTripTask).filter(models.PreTripTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get(
    "/trips/{trip_id}/pre-trip-tasks",
    response_model=List[schemas.PreTripTaskRead],
)
def list_pre_trip_tasks(
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.PreTripTask)
        .filter(models.PreTripTask.trip_id == trip.id)
        .order_by(models.PreTripTask.sort_order, models.PreTripTask.created_at)
        .all()
    )


@router.post(
    "/trips/{trip_id}/pre-trip-tasks",
    response_model=schemas.PreTripTaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_pre_trip_task(
    task: schemas.PreTripTaskCreate,
    trip: models.Trip = Depends(TripAccess("edit")),
    db: Session = Depends(get_db),
):
    db_task = models.PreTripTask(trip_id=trip.id, **task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.patch(
    "/pre-trip-tasks/{task_id}",
    response_model=schemas.PreTripTaskRead,
)
def update_pre_trip_task(
    task_id: int,
    update: schemas.PreTripTaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, db)
    get_trip_with_access(task.trip_id, db, current_user, "edit")
    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/pre-trip-tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pre_trip_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, db)
    get_trip_with_access(task.trip_id, db, current_user, "edit")
    db.delete(task)
    db.commit()
