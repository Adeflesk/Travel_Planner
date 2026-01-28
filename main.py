# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import models
import schemas
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Travel Planner API", version="1.0.0")
# Enable CORS (optional, adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.86.57:3000",  # Your network IP
        "http://192.168.86.57:8080",  # If using port 8080
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== HEALTH CHECK ====================
@app.get("/health")
def health_check():
    return {"status": "healthy"}


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
    trip = db.query(models.Trip).filter(models.Trip.id == destination.trip_id).first()
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
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
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
        db.query(models.Activity).filter(models.Activity.id == activity_id).first()
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
    trip = db.query(models.Trip).filter(models.Trip.id == expense.trip_id).first()
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


@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    for key, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)

    db.commit()
    db.refresh(expense)
    return expense


@app.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None


@app.get("/trips/{trip_id}/expenses/summary/", response_model=schemas.ExpenseSummary)
def get_expense_summary(trip_id: int, db: Session = Depends(get_db)):
    """Get expense summary with totals and category breakdown for a trip"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

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


@app.get("/trips/{trip_id}/progress/", response_model=schemas.TripProgress)
def get_trip_progress(trip_id: int, db: Session = Depends(get_db)):
    """Get activity completion progress for a trip"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Get all activities for this trip through destinations
    activities = (
        db.query(models.Activity)
        .join(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .all()
    )

    total = len(activities)
    completed = sum(1 for a in activities if a.is_completed)
    progress = round(completed / total * 100) if total > 0 else 0

    return {
        "total_activities": total,
        "completed_activities": completed,
        "progress_percent": progress,
    }


@app.get(
    "/trips/{trip_id}/destinations-with-activities/",
    response_model=List[schemas.DestinationWithActivities],
)
def get_destinations_with_activities(trip_id: int, db: Session = Depends(get_db)):
    """Get all destinations with their activities for a trip (eliminates N+1)"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    result = []
    for dest in destinations:
        activities = (
            db.query(models.Activity)
            .filter(models.Activity.destination_id == dest.id)
            .order_by(models.Activity.scheduled_date, models.Activity.scheduled_time)
            .all()
        )
        result.append({"destination": dest, "activities": activities})

    return result


@app.get("/trips/{trip_id}/timeline/", response_model=List[schemas.TimelineItem])
def get_trip_timeline(trip_id: int, db: Session = Depends(get_db)):
    """Get merged and sorted timeline of destinations and journeys for a trip"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    destinations = (
        db.query(models.Destination).filter(models.Destination.trip_id == trip_id).all()
    )

    journeys = db.query(models.Journey).filter(models.Journey.trip_id == trip_id).all()

    timeline = []

    # Add destinations to timeline
    for dest in destinations:
        sort_date = None
        if dest.arrival_date:
            from datetime import datetime, time

            sort_date = datetime.combine(dest.arrival_date, time.min)
        timeline.append(
            {"type": "destination", "sort_date": sort_date, "destination": dest}
        )

    # Add journeys to timeline
    for journey in journeys:
        timeline.append(
            {
                "type": "journey",
                "sort_date": journey.departure_datetime,
                "journey": journey,
            }
        )

    # Sort by date (items without dates go to the beginning)
    from datetime import datetime as dt

    timeline.sort(
        key=lambda x: x["sort_date"] if x["sort_date"] is not None else dt.min
    )

    return timeline


@app.get(
    "/trips/{trip_id}/accommodation-expenses/",
    response_model=List[schemas.DestinationAccommodation],
)
def get_accommodation_expenses(trip_id: int, db: Session = Depends(get_db)):
    """Get accommodation expenses grouped by destination for a trip"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    # Get all accommodation expenses for this trip
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
        # Find expenses for this destination
        dest_expenses = []
        for exp in accommodation_expenses:
            # Manual link takes priority
            if exp.destination_id == dest.id:
                dest_expenses.append(exp)
            # Auto-link by date if no manual link
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
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    for key, value in item_update.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@app.delete("/packing-items/{item_id}", status_code=204)
def delete_packing_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.PackingItem).filter(models.PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Packing item not found")

    db.delete(item)
    db.commit()
    return None


@app.get("/trips/{trip_id}/packing/summary/", response_model=schemas.PackingSummary)
def get_packing_summary(trip_id: int, db: Session = Depends(get_db)):
    """Get packing summary with progress and category breakdown for a trip"""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    items = (
        db.query(models.PackingItem)
        .filter(models.PackingItem.trip_id == trip_id)
        .order_by(models.PackingItem.category)
        .all()
    )

    total_items = len(items)
    packed_items = sum(1 for item in items if item.is_packed)
    progress_percent = round(packed_items / total_items * 100) if total_items > 0 else 0

    # Group by category
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


# ==================== JOURNEY ENDPOINTS ====================


@app.post("/journeys/", response_model=schemas.Journey, status_code=201)
def create_journey(journey: schemas.JourneyCreate, db: Session = Depends(get_db)):
    # Verify trip exists
    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Verify origin destination exists if provided
    if journey.origin_id:
        origin = (
            db.query(models.Destination)
            .filter(models.Destination.id == journey.origin_id)
            .first()
        )
        if not origin:
            raise HTTPException(status_code=404, detail="Origin destination not found")

    # Verify destination exists if provided
    if journey.destination_id:
        destination = (
            db.query(models.Destination)
            .filter(models.Destination.id == journey.destination_id)
            .first()
        )
        if not destination:
            raise HTTPException(
                status_code=404, detail="Destination destination not found"
            )

    db_journey = models.Journey(**journey.model_dump())
    db.add(db_journey)
    db.commit()
    db.refresh(db_journey)
    return db_journey


@app.get("/trips/{trip_id}/journeys/", response_model=List[schemas.Journey])
def get_trip_journeys(trip_id: int, db: Session = Depends(get_db)):
    journeys = (
        db.query(models.Journey)
        .filter(models.Journey.trip_id == trip_id)
        .order_by(models.Journey.order, models.Journey.departure_datetime)
        .all()
    )
    return journeys


@app.get("/journeys/{journey_id}", response_model=schemas.Journey)
def get_journey(journey_id: int, db: Session = Depends(get_db)):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return journey


@app.put("/journeys/{journey_id}", response_model=schemas.Journey)
def update_journey(
    journey_id: int,
    journey_update: schemas.JourneyUpdate,
    db: Session = Depends(get_db),
):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # Verify origin destination exists if being updated
    update_data = journey_update.model_dump(exclude_unset=True)
    if "origin_id" in update_data and update_data["origin_id"]:
        origin = (
            db.query(models.Destination)
            .filter(models.Destination.id == update_data["origin_id"])
            .first()
        )
        if not origin:
            raise HTTPException(status_code=404, detail="Origin destination not found")

    # Verify destination exists if being updated
    if "destination_id" in update_data and update_data["destination_id"]:
        destination = (
            db.query(models.Destination)
            .filter(models.Destination.id == update_data["destination_id"])
            .first()
        )
        if not destination:
            raise HTTPException(
                status_code=404, detail="Destination destination not found"
            )

    for key, value in update_data.items():
        setattr(journey, key, value)

    db.commit()
    db.refresh(journey)
    return journey


@app.delete("/journeys/{journey_id}", status_code=204)
def delete_journey(journey_id: int, db: Session = Depends(get_db)):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    db.delete(journey)
    db.commit()
    return None


# ==================== ROOT ENDPOINT ====================


@app.get("/")
def root():
    return {"message": "Travel Planner API", "version": "1.0.0", "docs": "/docs"}
