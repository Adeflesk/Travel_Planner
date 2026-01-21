# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Travel Planner API", version="1.0.0")

# ==================== TRIP ENDPOINTS ====================


@app.post("/trips/", response_model=schemas.Trip, status_code=201)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    db_trip = models.Trip(**trip.model_dump())
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


@app.get("/trips/", response_model=List[schemas.Trip])
def get_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    trips = db.query(models.Trip).offset(skip).limit(limit).all()
    return trips


@app.get("/trips/{trip_id}", response_model=schemas.Trip)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@app.put("/trips/{trip_id}", response_model=schemas.Trip)
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


@app.delete("/trips/{trip_id}", status_code=204)
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db.delete(trip)
    db.commit()
    return None


# ==================== DESTINATION ENDPOINTS ====================


@app.post("/destinations/", response_model=schemas.Destination, status_code=201)
def create_destination(
    destination: schemas.DestinationCreate, db: Session = Depends(get_db)
):
    # Verify trip exists
    trip = db.query(models.Trip).filter(
        models.Trip.id == destination.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db_destination = models.Destination(**destination.model_dump())
    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)
    return db_destination


@app.get("/trips/{trip_id}/destinations/", response_model=List[schemas.Destination])
def get_trip_destinations(trip_id: int, db: Session = Depends(get_db)):
    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )
    return destinations


@app.get("/destinations/{destination_id}", response_model=schemas.Destination)
def get_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@app.put("/destinations/{destination_id}", response_model=schemas.Destination)
def update_destination(
    destination_id: int,
    destination_update: schemas.DestinationUpdate,
    db: Session = Depends(get_db),
):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    for key, value in destination_update.model_dump(exclude_unset=True).items():
        setattr(destination, key, value)

    db.commit()
    db.refresh(destination)
    return destination


@app.delete("/destinations/{destination_id}", status_code=204)
def delete_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = (
        db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    )
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")

    db.delete(destination)
    db.commit()
    return None


# ==================== ACTIVITY ENDPOINTS ====================


@app.post("/activities/", response_model=schemas.Activity, status_code=201)
def create_activity(activity: schemas.ActivityCreate, db: Session = Depends(get_db)):
    # Verify destination exists
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


@app.get(
    "/destinations/{destination_id}/activities/", response_model=List[schemas.Activity]
)
def get_destination_activities(destination_id: int, db: Session = Depends(get_db)):
    activities = (
        db.query(models.Activity)
        .filter(models.Activity.destination_id == destination_id)
        .order_by(models.Activity.scheduled_date, models.Activity.scheduled_time)
        .all()
    )
    return activities


@app.put("/activities/{activity_id}", response_model=schemas.Activity)
def update_activity(
    activity_id: int,
    activity_update: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
):
    activity = (
        db.query(models.Activity).filter(
            models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    for key, value in activity_update.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity


@app.delete("/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = (
        db.query(models.Activity).filter(
            models.Activity.id == activity_id).first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return None


# ==================== EXPENSE ENDPOINTS ====================


@app.post("/expenses/", response_model=schemas.Expense, status_code=201)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    # Verify trip exists
    trip = db.query(models.Trip).filter(
        models.Trip.id == expense.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@app.get("/trips/{trip_id}/expenses/", response_model=List[schemas.Expense])
def get_trip_expenses(trip_id: int, db: Session = Depends(get_db)):
    expenses = (
        db.query(models.Expense)
        .filter(models.Expense.trip_id == trip_id)
        .order_by(models.Expense.date)
        .all()
    )
    return expenses


@app.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None


# ==================== PACKING ITEM ENDPOINTS ====================


@app.post("/packing-items/", response_model=schemas.PackingItem, status_code=201)
def create_packing_item(item: schemas.PackingItemCreate, db: Session = Depends(get_db)):
    # Verify trip exists
    trip = db.query(models.Trip).filter(models.Trip.id == item.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db_item = models.PackingItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/trips/{trip_id}/packing-items/", response_model=List[schemas.PackingItem])
def get_trip_packing_items(trip_id: int, db: Session = Depends(get_db)):
    items = (
        db.query(models.PackingItem)
        .filter(models.PackingItem.trip_id == trip_id)
        .order_by(models.PackingItem.category)
        .all()
    )
    return items


@app.put("/packing-items/{item_id}", response_model=schemas.PackingItem)
def update_packing_item(
    item_id: int, item_update: schemas.PackingItemUpdate, db: Session = Depends(get_db)
):
    item = db.query(models.PackingItem).filter(
        models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@app.delete("/packing-items/{item_id}", status_code=204)
def delete_packing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PackingItem).filter(
        models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    db.delete(item)
    db.commit()
    return None


# ==================== ROOT ENDPOINT ====================


@app.get("/")
def root():
    return {"message": "Travel Planner API", "version": "1.0.0", "docs": "/docs"}
