# Unified Activity Model Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the two separate `Activity` / `DayActivity` systems with a single `DayActivity` model that has both `day_id` and `destination_id`, so activities created in the day builder appear everywhere.

**Architecture:** Extend the `day_activities` table with `destination_id`, `is_todo`, `is_completed` and make `start_time` nullable. Drop the old `activities` table. Rewrite all backend and frontend code that touched `Activity` to use the unified `DayActivity` instead.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy, SQLite (local) / Postgres (prod), Next.js 14, TypeScript, Tailwind

---

### Task 1: Database migration

**Files:**
- Modify: `app/core/migrations.py`

**Step 1: Add `migrate_unified_activities` function**

After the existing helper functions in `app/core/migrations.py`, add:

```python
def migrate_unified_activities(engine: Engine) -> None:
    """
    Migrate to unified activity model:
    - Drop the old `activities` table
    - Recreate `day_activities` with destination_id, is_todo, is_completed, nullable start_time
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    with engine.begin() as conn:
        # 1. Drop old activities table if it exists
        if "activities" in existing_tables:
            conn.execute(text("DROP TABLE IF EXISTS activities"))
            logger.info("Dropped legacy activities table")

        # 2. Recreate day_activities with new schema if it exists but needs migration
        if "day_activities" in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns("day_activities")}
            needs_migration = "destination_id" not in existing_cols

            if needs_migration:
                conn.execute(text("""
                    CREATE TABLE day_activities_new (
                        id INTEGER PRIMARY KEY,
                        day_id INTEGER REFERENCES trip_days(id) ON DELETE CASCADE,
                        destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
                        start_time VARCHAR(5),
                        end_time VARCHAR(5),
                        title TEXT NOT NULL,
                        category VARCHAR(32),
                        location TEXT,
                        notes TEXT,
                        cost FLOAT,
                        currency VARCHAR(3),
                        booked BOOLEAN NOT NULL DEFAULT 0,
                        sort_order INTEGER NOT NULL DEFAULT 0,
                        is_todo BOOLEAN NOT NULL DEFAULT 0,
                        is_completed BOOLEAN NOT NULL DEFAULT 0
                    )
                """))
                conn.execute(text("""
                    INSERT INTO day_activities_new
                        (id, day_id, start_time, end_time, title, category,
                         location, notes, cost, currency, booked, sort_order,
                         is_todo, is_completed)
                    SELECT id, day_id, start_time, end_time, title, category,
                           location, notes, cost, currency, booked, sort_order,
                           0, 0
                    FROM day_activities
                """))
                conn.execute(text("DROP TABLE day_activities"))
                conn.execute(text("ALTER TABLE day_activities_new RENAME TO day_activities"))
                logger.info("Migrated day_activities to unified schema")
```

**Step 2: Call the function from `run_migrations`**

At the bottom of `run_migrations`, just before the final log line, add:

```python
    migrate_unified_activities(engine)
```

**Step 3: Verify migration runs cleanly**

```bash
source .venv/bin/activate
python -c "
from database import engine
from app.core.migrations import run_migrations
run_migrations(engine)
print('Migration OK')
"
```

Expected output: `Migration OK` with no errors.

**Step 4: Commit**

```bash
git add app/core/migrations.py
git commit -m "feat: add unified activities DB migration"
```

---

### Task 2: Backend model — update DayActivity, Destination, remove Activity

**Files:**
- Modify: `app/models/day_activity.py`
- Modify: `app/models/destination.py`
- Delete: `app/models/activity.py`
- Modify: `app/models/__init__.py`

**Step 1: Rewrite `app/models/day_activity.py`**

```python
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .base import Base


class DayActivity(Base):
    __tablename__ = "day_activities"

    id = Column(Integer, primary_key=True)
    day_id = Column(
        Integer, ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=True
    )
    destination_id = Column(
        Integer, ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True
    )
    start_time = Column(String(5))  # "HH:MM", nullable
    end_time = Column(String(5))
    title = Column(Text, nullable=False)
    category = Column(String(32))
    location = Column(Text)
    notes = Column(Text)
    cost = Column(Float)
    currency = Column(String(3))
    booked = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_todo = Column(Boolean, nullable=False, default=False)
    is_completed = Column(Boolean, nullable=False, default=False)

    day = relationship("TripDay", back_populates="activities")
    destination = relationship("Destination", back_populates="day_activities")
```

**Step 2: Update `app/models/destination.py`**

Replace the `activities` relationship:

```python
    # Remove this line:
    activities = relationship(
        "Activity", back_populates="destination", cascade="all, delete-orphan"
    )
    # Add this line instead:
    day_activities = relationship(
        "DayActivity", back_populates="destination", cascade="all, delete-orphan"
    )
```

**Step 3: Delete `app/models/activity.py`**

```bash
git rm app/models/activity.py
```

**Step 4: Update `app/models/__init__.py`**

Remove `from .activity import Activity` and `"Activity"` from `__all__`. Keep everything else.

```python
from .base import Base
from .user import User, UserRole
from .trip import Trip
from .trip_share import TripShare
from .trip_day import TripDay
from .user_settings import UserSettings
from .destination import Destination
from .expense import Expense
from .packing_item import PackingItem
from .day_activity import DayActivity
from .trip_transport import TripTransport
from .transport_option import TransportOption

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Trip",
    "TripShare",
    "Destination",
    "Expense",
    "PackingItem",
    "TripDay",
    "DayActivity",
    "UserSettings",
    "TripTransport",
    "TransportOption",
]
```

**Step 5: Verify import**

```bash
source .venv/bin/activate
python -c "from app import models; print('models OK')"
```

Expected: `models OK`

**Step 6: Commit**

```bash
git add app/models/day_activity.py app/models/destination.py app/models/__init__.py
git commit -m "feat: extend DayActivity with destination_id, is_todo, is_completed"
```

---

### Task 3: Backend schemas — update DayActivity, update aggregates, remove Activity

**Files:**
- Modify: `app/schemas/day_activity.py`
- Modify: `app/schemas/aggregates.py`
- Delete: `app/schemas/activity.py`
- Modify: `app/schemas/__init__.py`

**Step 1: Rewrite `app/schemas/day_activity.py`**

```python
from typing import Optional
from pydantic import BaseModel, ConfigDict, model_validator


class DayActivityBase(BaseModel):
    title: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: bool = False
    sort_order: int = 0
    is_todo: bool = False
    is_completed: bool = False


class DayActivityCreate(DayActivityBase):
    day_id: Optional[int] = None
    destination_id: Optional[int] = None

    @model_validator(mode="after")
    def check_at_least_one_parent(self) -> "DayActivityCreate":
        if self.day_id is None and self.destination_id is None:
            raise ValueError("At least one of day_id or destination_id must be set")
        return self


class DayActivityUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booked: Optional[bool] = None
    sort_order: Optional[int] = None
    is_todo: Optional[bool] = None
    is_completed: Optional[bool] = None
    destination_id: Optional[int] = None


class DayActivityResponse(DayActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_id: Optional[int] = None
    destination_id: Optional[int] = None
```

**Step 2: Update `app/schemas/aggregates.py`**

Replace the `Activity` import and `DestinationWithActivities` class:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from .destination import Destination
from .day_activity import DayActivityResponse
from .expense import Expense


class TripProgress(BaseModel):
    total_activities: int
    completed_activities: int
    progress_percent: int


class DestinationWithActivities(BaseModel):
    destination: Destination
    activities: list[DayActivityResponse]


class TimelineDestinationItem(BaseModel):
    type: str = "destination"
    sort_date: Optional[datetime] = None
    data: Destination


class DestinationAccommodation(BaseModel):
    destination: Destination
    expenses: list[Expense]
    total: float
```

**Step 3: Delete `app/schemas/activity.py`**

```bash
git rm app/schemas/activity.py
```

**Step 4: Update `app/schemas/__init__.py`**

Remove `from .activity import *` line. Keep all others.

**Step 5: Verify imports**

```bash
source .venv/bin/activate
python -c "from app import schemas; print('schemas OK')"
```

Expected: `schemas OK`

**Step 6: Commit**

```bash
git add app/schemas/day_activity.py app/schemas/aggregates.py app/schemas/__init__.py
git commit -m "feat: update schemas for unified DayActivity model"
```

---

### Task 4: Rewrite activity service

**Files:**
- Modify: `app/services/activity_service.py`

**Step 1: Rewrite `app/services/activity_service.py`**

```python
"""
app/services/activity_service.py - Activity services

All functions now operate on the unified DayActivity model.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app import models


def get_trip_progress(trip_id: int, db: Session) -> Optional[dict]:
    """Compute completion progress across all DayActivities for a trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    # Activities linked via a day belonging to the trip
    via_day = (
        db.query(models.DayActivity)
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(models.TripDay.trip_id == trip_id)
        .all()
    )
    # Activities linked via destination belonging to the trip
    via_dest = (
        db.query(models.DayActivity)
        .join(models.Destination, models.DayActivity.destination_id == models.Destination.id)
        .filter(models.Destination.trip_id == trip_id)
        .filter(models.DayActivity.day_id.is_(None))  # avoid double-counting
        .all()
    )

    activities = via_day + via_dest
    total = len(activities)
    completed = sum(1 for a in activities if a.is_completed)
    progress = round(completed / total * 100) if total > 0 else 0

    return {
        "total_activities": total,
        "completed_activities": completed,
        "progress_percent": progress,
    }


def get_destinations_with_activities(trip_id: int, db: Session) -> Optional[list[dict]]:
    """Return each destination with its DayActivities (for the Activities tab)."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.trip_id == trip_id)
        .order_by(models.Destination.order)
        .all()
    )

    result = []
    for dest in destinations:
        # Activities directly linked to this destination
        dest_activities = (
            db.query(models.DayActivity)
            .filter(models.DayActivity.destination_id == dest.id)
            .order_by(models.DayActivity.sort_order, models.DayActivity.start_time)
            .all()
        )
        result.append({"destination": dest, "activities": dest_activities})

    return result
```

**Step 2: Verify import**

```bash
source .venv/bin/activate
python -c "from app.services.activity_service import get_trip_progress, get_destinations_with_activities; print('service OK')"
```

Expected: `service OK`

**Step 3: Commit**

```bash
git add app/services/activity_service.py
git commit -m "feat: rewrite activity service to use unified DayActivity"
```

---

### Task 5: Replace activities router

**Files:**
- Modify: `app/routers/activities.py` (full replace)
- Modify: `app/routers/trip_days.py` (remove day-activity routes)
- Modify: `app/routers/__init__.py` (no change needed — still exports `activities_router`)

**Step 1: Rewrite `app/routers/activities.py`**

```python
"""
app/routers/activities.py - Unified activity endpoints

All CRUD for DayActivity (day-linked and/or destination-linked).
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from database import get_db

router = APIRouter(tags=["activities"])


def _get_activity_or_404(activity_id: int, db: Session) -> models.DayActivity:
    activity = db.query(models.DayActivity).filter(models.DayActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


def _check_trip_access(activity: models.DayActivity, db: Session, user: models.User, require_owner: bool = False) -> None:
    """Verify the user can access the trip this activity belongs to."""
    trip = None

    if activity.day_id:
        day = db.query(models.TripDay).filter(models.TripDay.id == activity.day_id).first()
        if day:
            trip = db.query(models.Trip).filter(models.Trip.id == day.trip_id).first()

    if trip is None and activity.destination_id:
        dest = db.query(models.Destination).filter(models.Destination.id == activity.destination_id).first()
        if dest:
            trip = db.query(models.Trip).filter(models.Trip.id == dest.trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Activity not found")

    if trip.user_id == user.id:
        return

    if not require_owner:
        share = db.query(models.TripShare).filter(
            models.TripShare.trip_id == trip.id,
            models.TripShare.user_id == user.id,
        ).first()
        if share:
            return

    raise HTTPException(status_code=404, detail="Activity not found")


@router.post(
    "/activities/",
    response_model=schemas.DayActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    activity: schemas.DayActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_activity = models.DayActivity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


@router.get(
    "/trips/{trip_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_trip_activities(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """All DayActivities for a trip (via day or via destination)."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    via_day = (
        db.query(models.DayActivity)
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(models.TripDay.trip_id == trip_id)
        .all()
    )
    via_dest = (
        db.query(models.DayActivity)
        .join(models.Destination, models.DayActivity.destination_id == models.Destination.id)
        .filter(models.Destination.trip_id == trip_id)
        .filter(models.DayActivity.day_id.is_(None))
        .all()
    )
    return via_day + via_dest


@router.get(
    "/trip-days/{day_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_day_activities(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.DayActivity)
        .filter(models.DayActivity.day_id == day_id)
        .order_by(models.DayActivity.start_time)
        .all()
    )


@router.get(
    "/destinations/{destination_id}/activities",
    response_model=List[schemas.DayActivityResponse],
)
def get_destination_activities(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return (
        db.query(models.DayActivity)
        .filter(models.DayActivity.destination_id == destination_id)
        .order_by(models.DayActivity.sort_order, models.DayActivity.start_time)
        .all()
    )


@router.patch(
    "/activities/{activity_id}",
    response_model=schemas.DayActivityResponse,
)
def update_activity(
    activity_id: int,
    update: schemas.DayActivityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = _get_activity_or_404(activity_id, db)
    _check_trip_access(activity, db, current_user, require_owner=True)

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    activity = _get_activity_or_404(activity_id, db)
    _check_trip_access(activity, db, current_user, require_owner=True)
    db.delete(activity)
    db.commit()
```

**Step 2: Remove day-activity routes from `app/routers/trip_days.py`**

Delete these four route functions (lines 128–204):
- `read_day_activities` (`GET /{day_id}/activities`)
- `create_day_activity` (`POST /activities`)
- `update_day_activity` (`PATCH /activities/{activity_id}`)
- `delete_day_activity` (`DELETE /activities/{activity_id}`)

The remaining routes (`GET /trips/{trip_id}/days`, `POST /`, `DELETE /{day_id}`, `PATCH /{day_id}`) stay intact.

**Step 3: Verify the app starts**

```bash
source .venv/bin/activate
python -c "from app.main import app; print('app OK')"
```

Expected: `app OK`

**Step 4: Commit**

```bash
git add app/routers/activities.py app/routers/trip_days.py
git commit -m "feat: replace activities router with unified DayActivity routes"
```

---

### Task 6: Rewrite backend tests

**Files:**
- Modify: `tests/test_activities_router.py` (full replace)
- Modify: `tests/test_activity_service.py` (full replace)

**Step 1: Rewrite `tests/test_activities_router.py`**

```python
from datetime import date
from app import models


def _make_trip_with_dest(db, user_id):
    trip = models.Trip(
        name="TestTrip", start_date=date(2030, 1, 1), end_date=date(2030, 1, 10),
        status="planning", user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    dest = models.Destination(name="Paris", trip_id=trip.id, country="France")
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return trip, dest


def _make_day(db, trip_id, date_val=date(2030, 1, 2)):
    day = models.TripDay(trip_id=trip_id, date=date_val, sort_order=0)
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


# --- Create ---

def test_create_activity_with_day(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)
    resp = client.post("/activities/", json={"title": "Eiffel Tower", "day_id": day.id})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Eiffel Tower"
    assert data["day_id"] == day.id


def test_create_activity_with_destination(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    resp = client.post("/activities/", json={"title": "Louvre", "destination_id": dest.id})
    assert resp.status_code == 201
    data = resp.json()
    assert data["destination_id"] == dest.id
    assert data["day_id"] is None


def test_create_activity_requires_parent(client, test_user):
    resp = client.post("/activities/", json={"title": "Orphan"})
    assert resp.status_code == 422  # validation error


# --- Read by trip ---

def test_get_trip_activities(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)
    a1 = models.DayActivity(title="Via Day", day_id=day.id, destination_id=dest.id)
    a2 = models.DayActivity(title="Via Dest", destination_id=dest.id)
    db_session.add_all([a1, a2])
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/activities")
    assert resp.status_code == 200
    titles = {a["title"] for a in resp.json()}
    assert "Via Day" in titles
    assert "Via Dest" in titles


# --- Read by destination ---

def test_get_destination_activities(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="Colosseum", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()

    resp = client.get(f"/destinations/{dest.id}/activities")
    assert resp.status_code == 200
    assert resp.json()[0]["title"] == "Colosseum"


def test_get_destination_activities_not_found(client, test_user):
    resp = client.get("/destinations/99999/activities")
    assert resp.status_code == 404


# --- Update ---

def test_update_activity(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="Old Title", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)

    resp = client.patch(f"/activities/{a.id}", json={"title": "New Title", "is_completed": True})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["is_completed"] is True


def test_update_activity_not_found(client, test_user):
    resp = client.patch("/activities/99999", json={"title": "x"})
    assert resp.status_code == 404


# --- Delete ---

def test_delete_activity(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="To Delete", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)

    resp = client.delete(f"/activities/{a.id}")
    assert resp.status_code == 204
    assert db_session.query(models.DayActivity).filter_by(id=a.id).first() is None


def test_delete_activity_not_found(client, test_user):
    resp = client.delete("/activities/99999")
    assert resp.status_code == 404
```

**Step 2: Run the new tests — expect all to pass**

```bash
source .venv/bin/activate
pytest tests/test_activities_router.py -v
```

Expected: all tests pass.

**Step 3: Rewrite `tests/test_activity_service.py`**

```python
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.activity_service import get_trip_progress, get_destinations_with_activities

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_function():
    models.Base.metadata.create_all(bind=engine)


def teardown_function():
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)


def _make_trip(db):
    trip = models.Trip(
        name="Test Trip", start_date=date.today(), end_date=date.today(),
        budget=Decimal("1000.00"),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_get_trip_progress_no_activities():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        progress = get_trip_progress(trip.id, db)
        assert progress == {"total_activities": 0, "completed_activities": 0, "progress_percent": 0}
    finally:
        db.close()


def test_get_trip_progress_with_activities():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        dest = models.Destination(trip_id=trip.id, name="Paris")
        db.add(dest)
        db.commit()
        db.refresh(dest)

        activities = [
            models.DayActivity(destination_id=dest.id, title="Eiffel Tower", is_completed=True),
            models.DayActivity(destination_id=dest.id, title="Louvre", is_completed=True),
            models.DayActivity(destination_id=dest.id, title="Montmartre", is_completed=False),
        ]
        db.add_all(activities)
        db.commit()

        progress = get_trip_progress(trip.id, db)
        assert progress["total_activities"] == 3
        assert progress["completed_activities"] == 2
        assert progress["progress_percent"] == 67
    finally:
        db.close()


def test_get_trip_progress_nonexistent_trip():
    db = TestingSessionLocal()
    try:
        assert get_trip_progress(999, db) is None
    finally:
        db.close()


def test_get_destinations_with_activities_empty():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        result = get_destinations_with_activities(trip.id, db)
        assert result == []
    finally:
        db.close()


def test_get_destinations_with_activities_nested():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        dest1 = models.Destination(trip_id=trip.id, name="Paris", order=0)
        dest2 = models.Destination(trip_id=trip.id, name="London", order=1)
        db.add_all([dest1, dest2])
        db.commit()
        db.refresh(dest1)
        db.refresh(dest2)

        db.add_all([
            models.DayActivity(destination_id=dest1.id, title="Eiffel Tower"),
            models.DayActivity(destination_id=dest1.id, title="Louvre"),
            models.DayActivity(destination_id=dest2.id, title="Big Ben"),
        ])
        db.commit()

        result = get_destinations_with_activities(trip.id, db)
        assert len(result) == 2
        assert result[0]["destination"].name == "Paris"
        assert len(result[0]["activities"]) == 2
        assert result[1]["destination"].name == "London"
        assert len(result[1]["activities"]) == 1
    finally:
        db.close()


def test_get_destinations_with_activities_nonexistent_trip():
    db = TestingSessionLocal()
    try:
        assert get_destinations_with_activities(999, db) is None
    finally:
        db.close()
```

**Step 4: Run the new service tests**

```bash
source .venv/bin/activate
pytest tests/test_activity_service.py -v
```

Expected: all tests pass.

**Step 5: Run full test suite**

```bash
source .venv/bin/activate
pytest -q --cov=app tests/
```

Expected: all tests pass (some old activity-related tests in other files may need minor fixes — fix any failures before proceeding).

**Step 6: Commit**

```bash
git add tests/test_activities_router.py tests/test_activity_service.py
git commit -m "test: rewrite activity tests for unified DayActivity model"
```

---

### Task 7: Frontend types

**Files:**
- Modify: `frontend/lib/types.ts`

**Step 1: Update `DayActivity` interface — add new fields, make `start_time` optional**

Find the `DayActivity` interface (around line 503) and replace it:

```typescript
export interface DayActivity {
  id: number;
  day_id?: number | null;
  destination_id?: number | null;
  start_time?: string;
  end_time?: string;
  title: string;
  category?: string;
  location?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  booked: boolean;
  sort_order: number;
  is_todo: boolean;
  is_completed: boolean;
}

export interface DayActivityCreate extends Partial<DayActivity> {
  title: string;
  day_id?: number | null;
  destination_id?: number | null;
}
```

**Step 2: Remove `Activity` and `ActivityFormData` interfaces**

Delete the `Activity` interface (lines 75–90) and `ActivityFormData` interface (lines 254–269).

**Step 3: Update `DestinationWithActivities` to use `DayActivity`**

Find `DestinationWithActivities` (around line 300) and update:

```typescript
export interface DestinationWithActivities {
  destination: Destination;
  activities: DayActivity[];
}
```

**Step 4: Verify TypeScript compiles (will show errors — that's expected for now)**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

Note the errors — they'll be fixed in subsequent tasks.

**Step 5: Commit**

```bash
git add frontend/lib/types.ts
git commit -m "feat: update DayActivity type, remove Activity type"
```

---

### Task 8: Frontend API client

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Update imports at top of `api.ts`**

Remove `Activity`, `ActivityFormData`, `DestinationWithActivities` from the import. Keep `DayActivity`, `DayActivityCreate`.

**Step 2: Remove `activityApi` block** (lines 167–194)

**Step 3: Update `dayApi`**

Replace the entire `dayApi` block with:

```typescript
export const dayApi = {
  createActivity: (data: DayActivityCreate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof typeof data>).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (value !== '' && value !== undefined && value !== null && !Number.isNaN(value)) {
        cleanedData[key] = value;
      }
    });
    return api.post<DayActivity>('/activities/', cleanedData);
  },
  updateActivity: (id: number, data: Partial<DayActivity>) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof typeof data>).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (key === 'day_id' || key === 'id') return;
      if (value !== '' && value !== undefined && value !== null && !Number.isNaN(value)) {
        cleanedData[key] = value;
      }
    });
    return api.patch<DayActivity>(`/activities/${id}`, cleanedData);
  },
  deleteActivity: (id: number) => api.delete(`/activities/${id}`),
  getActivities: (dayId: number) =>
    api.get<DayActivity[]>(`/trip-days/${dayId}/activities`),
  getByTrip: (tripId: number) =>
    api.get<DayActivity[]>(`/trips/${tripId}/activities`),
  getByDestination: (destinationId: number) =>
    api.get<DayActivity[]>(`/destinations/${destinationId}/activities`),
};
```

**Step 4: Update `tripApi`** — remove `getDestinationsWithActivities` and `getProgress` if they are now unused (check usages first with grep):

```bash
cd frontend && grep -r "getDestinationsWithActivities\|getProgress" --include="*.ts" --include="*.tsx" .
```

If only used in `useTripActivities.ts` (which we'll rewrite next), remove both from `tripApi`.

**Step 5: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: replace activityApi with unified dayApi methods"
```

---

### Task 9: Update day builder hook

**Files:**
- Modify: `frontend/components/days/useDayBuilder.ts`

**Step 1: Update `handleSaveActivity` to pass `destination_id`**

The hook receives `day: TripDay`. When creating, spread in `destination_id` from the day:

```typescript
const handleSaveActivity = async (data: Partial<DayActivity>) => {
    setIsSubmitting(true);
    try {
        if (data.id) {
            await dayApi.updateActivity(data.id, data);
        } else {
            await dayApi.createActivity({
                ...data,
                day_id: day.id,
                destination_id: day.destination_id ?? undefined,
                title: data.title ?? '',
            } as DayActivityCreate);
        }
        onRefresh();
        setIsFormOpen(false);
    } catch (error) {
        console.error('Failed to save activity:', error);
        alert('Failed to save activity');
    } finally {
        setIsSubmitting(false);
    }
};
```

**Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "useDayBuilder"
```

Expected: no errors for this file.

**Step 3: Commit**

```bash
git add frontend/components/days/useDayBuilder.ts
git commit -m "feat: pass destination_id when creating day builder activities"
```

---

### Task 10: Rewrite Activities tab frontend

**Files:**
- Modify: `frontend/components/trip-activities/useTripActivities.ts`
- Modify: `frontend/components/trip-activities/ActivityRow.tsx`
- Modify: `frontend/components/trip-activities/DestinationActivitiesSection.tsx`
- Modify: `frontend/components/trip-activities/TripActivityList.tsx`

**Step 1: Rewrite `useTripActivities.ts`**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayActivity, Destination, DestinationWithActivities } from '@/lib/types';
import { dayApi, destinationApi } from '@/lib/api';

export type { DestinationWithActivities };

export function useTripActivities(tripId: number) {
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [actsRes, destsRes] = await Promise.all([
        dayApi.getByTrip(tripId),
        destinationApi.getByTripId(tripId),
      ]);
      setActivities(actsRes.data);
      setDestinations(destsRes.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group activities by destination_id
  const destinationsWithActivities: DestinationWithActivities[] = destinations.map((dest) => ({
    destination: dest,
    activities: activities.filter((a) => a.destination_id === dest.id),
  }));

  const totalActivities = activities.filter((a) => a.is_completed !== undefined).length;
  const completedActivities = activities.filter((a) => a.is_completed).length;
  const progressPercent = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  const toggleComplete = async (activity: DayActivity) => {
    try {
      await dayApi.updateActivity(activity.id, { is_completed: !activity.is_completed });
      loadData();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const deleteActivity = async (id: number) => {
    try {
      await dayApi.deleteActivity(id);
      loadData();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  return {
    destinationsWithActivities,
    loading,
    totalActivities,
    completedActivities,
    progressPercent,
    toggleComplete,
    deleteActivity,
  };
}
```

**Step 2: Rewrite `ActivityRow.tsx`**

```typescript
'use client';

import { DayActivity } from '@/lib/types';
import { Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ActivityRowProps {
  activity: DayActivity;
  onToggleComplete: (activity: DayActivity) => void;
  onDelete: (id: number) => void;
}

export function ActivityRow({ activity, onToggleComplete, onDelete }: ActivityRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${activity.is_completed ? 'bg-green-50' : ''}`}>
      <button
        onClick={() => onToggleComplete(activity)}
        className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label={activity.is_completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {activity.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${activity.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {activity.title}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {activity.category && <span className="capitalize">{activity.category}</span>}
          {activity.start_time && (
            <>
              {activity.category && <span>•</span>}
              <Clock className="w-3 h-3" />
              <span>{activity.start_time}</span>
            </>
          )}
          {activity.booked && (
            <Badge variant="success" size="sm">Booked</Badge>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(activity.id)}
        className="text-red-600 hover:text-red-700 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        aria-label="Delete activity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
```

**Step 3: Update `DestinationActivitiesSection.tsx`**

Change the type import from `Activity` to `DayActivity`:

```typescript
import { DayActivity, Destination } from '@/lib/types';
// ...
interface DestinationActivitiesSectionProps {
  destination: Destination;
  activities: DayActivity[];
  onToggleComplete: (activity: DayActivity) => void;
  onDelete: (id: number) => void;
}
```

The JSX inside is unchanged except the map now uses `DayActivity` — TypeScript will be satisfied after the type update.

**Step 4: Update `TripActivityList.tsx`**

Update the empty state message (the old text referred to adding activities via Destinations tab):

Replace the bottom `<p>` hint:
```typescript
// Remove this:
<p className="text-sm text-gray-500 mt-4 text-center">
  To add activities, go to the Destinations tab and add them to each destination.
</p>

// Replace with nothing (or a more accurate hint):
<p className="text-sm text-gray-500 mt-4 text-center">
  Add activities from the day builder or directly under each destination.
</p>
```

**Step 5: Run TypeScript check on this folder**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "trip-activities"
```

Expected: no errors.

**Step 6: Commit**

```bash
git add frontend/components/trip-activities/
git commit -m "feat: rewrite Activities tab to use unified DayActivity"
```

---

### Task 11: Replace destination activities frontend

**Files:**
- Modify: `frontend/components/destinations/DestinationItem.tsx`
- Delete: `frontend/components/activities/` (entire folder)
- Create: `frontend/components/destinations/DestinationActivityList.tsx`

**Step 1: Create `frontend/components/destinations/DestinationActivityList.tsx`**

A simple replacement for the old `ActivityList` that uses `DayActivity`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayActivity } from '@/lib/types';
import { dayApi } from '@/lib/api';
import { CheckCircle2, Circle, Trash2, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ActivityForm } from '@/components/days/ActivityForm';

interface DestinationActivityListProps {
  destinationId: number;
}

export function DestinationActivityList({ destinationId }: DestinationActivityListProps) {
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<DayActivity> | undefined>();

  const reload = useCallback(async () => {
    try {
      const res = await dayApi.getByDestination(destinationId);
      setActivities(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => { reload(); }, [reload]);

  const handleSave = async (data: Partial<DayActivity>) => {
    if (data.id) {
      await dayApi.updateActivity(data.id, data);
    } else {
      await dayApi.createActivity({ ...data, destination_id: destinationId, title: data.title ?? '' });
    }
    reload();
  };

  const handleDelete = async (id: number) => {
    await dayApi.deleteActivity(id);
    reload();
  };

  const handleToggle = async (activity: DayActivity) => {
    await dayApi.updateActivity(activity.id, { is_completed: !activity.is_completed });
    reload();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No activities yet.</p>
      ) : (
        activities.map((a) => (
          <div key={a.id} className={`flex items-center gap-2 py-1.5 ${a.is_completed ? 'opacity-60' : ''}`}>
            <button onClick={() => handleToggle(a)} aria-label="Toggle complete">
              {a.is_completed
                ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                : <Circle className="w-4 h-4 text-gray-400" />}
            </button>
            <span
              className={`flex-1 text-sm cursor-pointer hover:text-sky-600 ${a.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
              onClick={() => { setEditingActivity(a); setIsFormOpen(true); }}
            >
              {a.title}
            </span>
            {a.start_time && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />{a.start_time}
              </span>
            )}
            <button onClick={() => handleDelete(a.id)} aria-label="Delete" className="text-red-500 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Plus />}
        onClick={() => { setEditingActivity(undefined); setIsFormOpen(true); }}
      >
        Add activity
      </Button>

      {isFormOpen && (
        <ActivityForm
          activity={editingActivity}
          dayId={0}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditingActivity(undefined); }}
          onDelete={editingActivity?.id ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
```

**Step 2: Update `DestinationItem.tsx`**

Replace the import and usage of `ActivityList`:

```typescript
// Remove:
import { ActivityList } from '../activities';

// Add:
import { DestinationActivityList } from './DestinationActivityList';
```

And in JSX replace:
```typescript
// Remove:
<ActivityList
  destinationId={destination.id}
  destinationArrivalDate={destination.arrival_date}
/>

// Add:
<DestinationActivityList destinationId={destination.id} />
```

**Step 3: Delete old `components/activities/` folder**

```bash
git rm -r frontend/components/activities/
```

**Step 4: Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any remaining type errors before continuing.

**Step 5: Run lint**

```bash
cd frontend && npm run lint
```

Fix any lint errors.

**Step 6: Commit**

```bash
git add frontend/components/destinations/ frontend/components/activities/
git commit -m "feat: replace destination ActivityList with unified DayActivity component"
```

---

### Task 12: Final verification

**Step 1: Run all backend tests**

```bash
source .venv/bin/activate
pytest -q --cov=app tests/
```

Expected: all tests pass.

**Step 2: Start backend and smoke test**

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

In a second terminal:
```bash
curl http://localhost:8000/docs
```

Expected: docs load (in dev mode). Verify the following endpoints exist:
- `POST /activities/`
- `GET /trips/{trip_id}/activities`
- `GET /trip-days/{day_id}/activities`
- `GET /destinations/{destination_id}/activities`
- `PATCH /activities/{id}`
- `DELETE /activities/{id}`

**Step 3: Start frontend and manual smoke test**

```bash
cd frontend && npm run dev
```

1. Open a trip → Day builder → Add an activity → Save
2. Go back to trip → Activities tab → activity should appear under its destination
3. Go to Destinations tab → expand destination → activity should appear there too

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: unified activity model complete — DayActivity is the single source of truth"
```
