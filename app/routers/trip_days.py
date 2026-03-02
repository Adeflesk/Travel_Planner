from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from app import models, schemas
from app.core.deps import get_current_user

router = APIRouter(prefix="/trip-days", tags=["days"])


@router.get("/trips/{trip_id}/days", response_model=List[schemas.TripDayResponse])
def read_trip_days(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    days = (
        db.query(models.TripDay)
        .filter(models.TripDay.trip_id == trip_id)
        .order_by(models.TripDay.date)
        .all()
    )
    return days


@router.post(
    "/", response_model=schemas.TripDayResponse, status_code=status.HTTP_201_CREATED
)
def create_trip_day(
    day: schemas.TripDayCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify the trip exists
    trip = db.query(models.Trip).filter(models.Trip.id == day.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # ---- New validation: ensure destination (if provided) belongs to this trip ----
    if day.destination_id is not None:
        dest = (
            db.query(models.Destination)
            .filter(models.Destination.id == day.destination_id)
            .first()
        )
        if not dest:
            raise HTTPException(status_code=400, detail="Destination not found")
        if dest.trip_id != day.trip_id:
            raise HTTPException(
                status_code=400,
                detail="Destination does not belong to the specified trip",
            )
    # ---------------------------------------------------------------------------

    db_day = models.TripDay(**day.model_dump())
    try:
        db.add(db_day)
        db.commit()
        db.refresh(db_day)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="A day with this date already exists for this trip"
        )
    return db_day


@router.delete("/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip_day(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_day = db.query(models.TripDay).filter(models.TripDay.id == day_id).first()
    if not db_day:
        raise HTTPException(status_code=404, detail="Trip day not found")
    db.delete(db_day)
    db.commit()


@router.patch("/{day_id}", response_model=schemas.TripDayResponse)
def update_trip_day(
    day_id: int,
    day_update: schemas.TripDayUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_day = db.query(models.TripDay).filter(models.TripDay.id == day_id).first()
    if not db_day:
        raise HTTPException(status_code=404, detail="Trip day not found")

    # ---- New validation: ensure destination (if provided) belongs to the same trip ----
    if day_update.destination_id is not None:
        dest = (
            db.query(models.Destination)
            .filter(models.Destination.id == day_update.destination_id)
            .first()
        )
        if not dest:
            raise HTTPException(status_code=400, detail="Destination not found")
        if dest.trip_id != db_day.trip_id:
            raise HTTPException(
                status_code=400,
                detail="Destination does not belong to the same trip as this day",
            )
    # ---------------------------------------------------------------------------

    update_data = day_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_day, key, value)

    try:
        db.commit()
        db.refresh(db_day)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="A day with this date already exists for this trip"
        )
    return db_day
