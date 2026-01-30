"""
app/routers/trips.py - Trip endpoints router

CRUD endpoints and trip-level aggregates for trips.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db

from app.services.expense_service import get_expense_summary as svc_get_expense_summary
from app.services.packing_service import get_packing_summary as svc_get_packing_summary
from app.services.activity_service import (
    get_trip_progress as svc_get_trip_progress,
    get_destinations_with_activities as svc_get_destinations_with_activities,
)
from app.services.timeline_service import (
    get_timeline as svc_get_timeline,
    get_accommodation_expenses as svc_get_accommodation_expenses,
)

router = APIRouter()


@router.post("/trips/", response_model=schemas.Trip, status_code=201, tags=["trips"])
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    db_trip = models.Trip(**trip.model_dump())
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


@router.get("/trips/", response_model=List[schemas.Trip], tags=["trips"])
def get_trips(db: Session = Depends(get_db)):
    trips = db.query(models.Trip).order_by(models.Trip.created_at.desc()).all()
    return trips


@router.get("/trips/{trip_id}", response_model=schemas.Trip, tags=["trips"])
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.put("/trips/{trip_id}", response_model=schemas.Trip, tags=["trips"])
def update_trip(
    trip_id: int, trip_update: schemas.TripUpdate, db: Session = Depends(get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    for key, value in trip_update.model_dump(exclude_unset=True).items():
        setattr(trip, key, value)

    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/trips/{trip_id}", status_code=204, tags=["trips"])
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db.delete(trip)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/expenses/summary/",
    response_model=schemas.ExpenseSummary,
    tags=["trips"],
)
def get_expense_summary(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_expense_summary(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/progress/", response_model=schemas.TripProgress, tags=["trips"]
)
def get_trip_progress(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_trip_progress(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/destinations-with-activities/",
    response_model=List[schemas.DestinationWithActivities],
    tags=["trips"],
)
def get_destinations_with_activities(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_destinations_with_activities(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/timeline/",
    response_model=List[schemas.TimelineItem],
    tags=["trips"],
)
def get_trip_timeline(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_timeline(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/accommodation-expenses/",
    response_model=List[schemas.DestinationAccommodation],
    tags=["trips"],
)
def get_accommodation_expenses(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_accommodation_expenses(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result


@router.get(
    "/trips/{trip_id}/accommodation-expenses/",
    response_model=List[schemas.DestinationAccommodation],
    tags=["trips"],
)
def get_accommodation_expenses(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

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
