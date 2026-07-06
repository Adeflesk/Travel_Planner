# Road Trip Workflow Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four road-trip-focused features: pre-trip booking checklist, driving leg waypoints, day-level alerts, and activity book-by deadlines.

**Architecture:** Backend-first (migrations → models → schemas → routers → dashboard), then frontend (types → API client → components). Each feature is independent; tasks are ordered by dependency (DB changes first, UI last). Dashboard action items for the two new types require both backend and frontend updates in Tasks 6 and 13.

**Tech Stack:** FastAPI + SQLAlchemy + Pydantic v2 (backend), Next.js 14 App Router + TypeScript + Tailwind + react-hook-form (frontend), pytest + TestClient (tests).

---

## Spec note: transport type "driving" vs "drive"

The spec (Feature 2) says to add `"driving"` to the transport type enum. **The codebase already uses `"drive"`** (see `TransportType = Literal["flight", "train", "bus", "drive", "ferry", "other"]`). No enum change is needed — only the `waypoints` column addition is required.

---

## Files Created / Modified

**Backend:**
- Modify: `app/core/migrations.py` — add 3 column helpers + `create_pre_trip_tasks_table`
- Modify: `app/models/day_activity.py` — add `book_by_date`
- Modify: `app/models/trip_day.py` — add `alerts`
- Modify: `app/models/trip_transport.py` — add `waypoints`
- Create: `app/models/pre_trip_task.py` — new model
- Modify: `app/models/trip.py` — add `pre_trip_tasks` relationship
- Modify: `app/models/__init__.py` — export `PreTripTask`
- Modify: `app/schemas/day_activity.py` — add `book_by_date`
- Modify: `app/schemas/trip_day.py` — add `DayAlert`, add `alerts`
- Modify: `app/schemas/trip_transport.py` — add `waypoints`
- Create: `app/schemas/pre_trip_task.py` — new schemas
- Modify: `app/schemas/__init__.py` — export pre_trip_task schemas
- Modify: `app/schemas/dashboard.py` — extend `ActionItemType` Literal
- Create: `app/routers/pre_trip_tasks.py` — CRUD router
- Modify: `app/routers/__init__.py` — export `pre_trip_tasks_router`
- Modify: `app/main.py` — register router
- Modify: `app/services/dashboard_service.py` — add 2 new action item types
- Create: `tests/test_pre_trip_tasks.py`
- Create: `tests/test_road_trip_fields.py` — book_by_date, alerts, waypoints
- Create: `tests/test_dashboard_road_trip.py`
- Modify: `tests/conftest.py` — add `pre_trip_tasks` + `accommodations` to `tables_to_clean`

**Frontend:**
- Modify: `frontend/lib/types.ts` — extend DayActivity, TripDay, TripTransport, DashboardData; add DayAlert, PreTripTask, PreTripTaskCreate
- Modify: `frontend/lib/api.ts` — add `preTrip` API object
- Modify: `frontend/components/days/ActivityForm.tsx` — add `book_by_date` field
- Modify: `frontend/components/days/ActivityBlock.tsx` — add book-by badge
- Modify: `frontend/components/transport/TransportForm.tsx` — add `waypoints` state + textarea for drive
- Modify: `frontend/components/days/TransportBlock.tsx` — show waypoints for drive type
- Modify: `frontend/components/days/DayTimeline.tsx` — add `alerts` prop + alerts UI section
- Modify: `frontend/components/days/DayBuilder.tsx` — thread `alerts` and `onUpdateAlerts`
- Create: `frontend/components/pre-trip-tasks/usePreTripTasks.ts`
- Create: `frontend/components/pre-trip-tasks/PreTripTaskRow.tsx`
- Create: `frontend/components/pre-trip-tasks/PreTripTaskList.tsx`
- Create: `frontend/components/pre-trip-tasks/index.ts`
- Modify: `frontend/app/trips/[id]/page.tsx` — add "Before you go" panel
- Modify: `frontend/components/dashboard/ActionItemsList.tsx` — extend `typeMeta`

---

## Task 1: Database Migrations

**Files:**
- Modify: `app/core/migrations.py`
- Modify: `tests/conftest.py`

- [ ] **Step 1: Add column helpers and table creator to `run_migrations`**

Open `app/core/migrations.py`. Add these functions before `run_migrations`, then call them from inside `run_migrations` at the end:

```python
def create_pre_trip_tasks_table(engine: Engine) -> None:
    """Create pre_trip_tasks table if it doesn't exist."""
    dialect = engine.dialect.name
    if dialect == "postgresql":
        create_sql = """
            CREATE TABLE IF NOT EXISTS pre_trip_tasks (
                id SERIAL PRIMARY KEY,
                trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                book_by_date DATE,
                url TEXT,
                cost FLOAT,
                currency VARCHAR(10),
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """
    else:
        create_sql = """
            CREATE TABLE IF NOT EXISTS pre_trip_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                book_by_date DATE,
                url TEXT,
                cost REAL,
                currency VARCHAR(10),
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """
    try:
        with engine.begin() as conn:
            conn.execute(text(create_sql))
        logger.info("Ensured pre_trip_tasks table exists")
    except Exception as e:
        logger.error(f"Failed to create pre_trip_tasks table: {type(e).__name__}: {e}")
```

At the **end** of `run_migrations`, add:

```python
    # Road trip features: new columns
    road_trip_day_activity_columns = [
        ("book_by_date", "DATE", "NULL"),
    ]
    for col_name, col_type, default in road_trip_day_activity_columns:
        if add_column_if_not_exists(engine, "day_activities", col_name, col_type, default):
            applied_migrations.append(f"day_activities.{col_name}")

    road_trip_day_columns = [
        ("alerts", "TEXT", "NULL"),
    ]
    for col_name, col_type, default in road_trip_day_columns:
        if add_column_if_not_exists(engine, "trip_days", col_name, col_type, default):
            applied_migrations.append(f"trip_days.{col_name}")

    road_trip_transport_columns = [
        ("waypoints", "TEXT", "NULL"),
    ]
    for col_name, col_type, default in road_trip_transport_columns:
        if add_column_if_not_exists(engine, "trip_transports", col_name, col_type, default):
            applied_migrations.append(f"trip_transports.{col_name}")

    create_pre_trip_tasks_table(engine)
```

- [ ] **Step 2: Update `conftest.py` tables_to_clean**

In `tests/conftest.py`, find the `tables_to_clean` list and add `"pre_trip_tasks"` and `"accommodations"` in the correct FK order (before `"trips"`):

```python
    tables_to_clean = [
        "rate_snapshots",
        "user_settings",
        "trip_shares",
        "packing_items",
        "pre_trip_tasks",       # new
        "accommodations",        # was missing
        "day_activities",
        "transport_options",
        "activity_expenses",
        "transport_expenses",
        "stop_expenses",
        "trip_transports",
        "expenses",
        "destinations",
        "trip_days",
        "trips",
        "users",
    ]
```

- [ ] **Step 3: Verify migrations run clean**

```bash
source .venv/bin/activate
python -c "from database import engine; from app.core.migrations import run_migrations; run_migrations(engine)"
```

Expected: no errors, log output shows columns added or "No migrations needed".

- [ ] **Step 4: Commit**

```bash
git add app/core/migrations.py tests/conftest.py
git commit -m "feat: add road trip DB migrations (book_by_date, alerts, waypoints, pre_trip_tasks)"
```

---

## Task 2: Feature 4 Backend — Activity `book_by_date`

**Files:**
- Modify: `app/models/day_activity.py`
- Modify: `app/schemas/day_activity.py`
- Create: `tests/test_road_trip_fields.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_road_trip_fields.py`:

```python
from datetime import date
from app import models


def _make_trip_and_day(db, user_id):
    trip = models.Trip(
        name="Road Trip", start_date=date(2030, 6, 1),
        end_date=date(2030, 6, 14), status="planning", user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    day = models.TripDay(trip_id=trip.id, date=date(2030, 6, 1), sort_order=0)
    db.add(day)
    db.commit()
    db.refresh(day)
    return trip, day


def test_activity_book_by_date_create(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    resp = client.post("/activities/", json={
        "title": "Permits",
        "day_id": day.id,
        "book_by_date": "2030-04-01",
    })
    assert resp.status_code == 201
    assert resp.json()["book_by_date"] == "2030-04-01"


def test_activity_book_by_date_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post("/activities/", json={"title": "Tour", "day_id": day.id})
    activity_id = create.json()["id"]
    resp = client.patch(f"/activities/{activity_id}", json={"book_by_date": "2030-05-15"})
    assert resp.status_code == 200
    assert resp.json()["book_by_date"] == "2030-05-15"


def test_activity_book_by_date_clears_when_booked(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post("/activities/", json={
        "title": "Tour", "day_id": day.id, "book_by_date": "2030-05-15"
    })
    activity_id = create.json()["id"]
    resp = client.patch(f"/activities/{activity_id}", json={"booked": True, "book_by_date": None})
    assert resp.status_code == 200
    assert resp.json()["book_by_date"] is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source .venv/bin/activate && pytest tests/test_road_trip_fields.py::test_activity_book_by_date_create -v
```

Expected: FAIL — `book_by_date` not in response (field missing from model/schema).

- [ ] **Step 3: Add `book_by_date` to `DayActivity` model**

In `app/models/day_activity.py`, add after the `longitude` column:

```python
from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Text
```

(add `Date` to the import)

```python
    book_by_date = Column(Date, nullable=True)
```

- [ ] **Step 4: Add `book_by_date` to schemas**

In `app/schemas/day_activity.py`:

Add to imports at top:
```python
import datetime
```

In `DayActivityBase`, add:
```python
    book_by_date: datetime.date | None = None
```

In `DayActivityUpdate`, add:
```python
    book_by_date: datetime.date | None = None
```

`DayActivityResponse` inherits from `DayActivityBase` so it gets the field automatically.

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_road_trip_fields.py::test_activity_book_by_date_create tests/test_road_trip_fields.py::test_activity_book_by_date_patch tests/test_road_trip_fields.py::test_activity_book_by_date_clears_when_booked -v
```

Expected: 3 PASS.

- [ ] **Step 6: Run full test suite**

```bash
pytest -q --cov=app tests/
```

Expected: all existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add app/models/day_activity.py app/schemas/day_activity.py tests/test_road_trip_fields.py
git commit -m "feat: add book_by_date to DayActivity model and schema"
```

---

## Task 3: Feature 3 Backend — Day `alerts`

**Files:**
- Modify: `app/models/trip_day.py`
- Modify: `app/schemas/trip_day.py`

- [ ] **Step 1: Add failing test**

Append to `tests/test_road_trip_fields.py`:

```python
def test_day_alerts_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    alerts = [
        {"text": "Flash flood risk in afternoon", "severity": "warning"},
        {"text": "Shuttle timing: first at 6am", "severity": "info"},
    ]
    resp = client.patch(f"/trip-days/{day.id}", json={"alerts": alerts})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["alerts"]) == 2
    assert data["alerts"][0]["severity"] == "warning"


def test_day_alerts_replace(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    client.patch(f"/trip-days/{day.id}", json={"alerts": [{"text": "A", "severity": "tip"}]})
    resp = client.patch(f"/trip-days/{day.id}", json={"alerts": []})
    assert resp.status_code == 200
    assert resp.json()["alerts"] == []
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_road_trip_fields.py::test_day_alerts_patch -v
```

Expected: FAIL — `alerts` not in response.

- [ ] **Step 3: Add `alerts` to `TripDay` model**

In `app/models/trip_day.py`, add `JSON` to imports:

```python
from sqlalchemy import Column, Integer, Text, Date, ForeignKey, JSON, UniqueConstraint
```

Add column after `destination_id`:

```python
    alerts = Column(JSON, nullable=True)
```

- [ ] **Step 4: Update `TripDay` schemas**

In `app/schemas/trip_day.py`, replace the file contents with:

```python
import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict
from .day_activity import DayActivityResponse


class DayAlert(BaseModel):
    text: str
    severity: Literal["warning", "info", "tip"]


class TripDayBase(BaseModel):
    trip_id: int
    date: datetime.date
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0
    destination_id: Optional[int] = None
    alerts: Optional[List[DayAlert]] = None


class TripDayCreate(TripDayBase):
    pass


class TripDayUpdate(BaseModel):
    date: Optional[datetime.date] = None
    title: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None
    destination_id: Optional[int] = None
    alerts: Optional[List[DayAlert]] = None


class TripDayResponse(TripDayBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activities: List[DayActivityResponse] = []
```

- [ ] **Step 5: Check the trip_days router handles JSON alerts in PATCH**

Open `app/routers/trip_days.py` and look at the PATCH handler. The `TripDayUpdate` uses `model_dump(exclude_unset=True)` to update fields. Since `alerts` is a `list[DayAlert]` in the schema, it needs to be stored as a plain list of dicts. Add a serialization step in the PATCH handler. Find the line that does `setattr` or field assignment, and after getting the update dict, serialize `alerts`:

```python
    update_data = update.model_dump(exclude_unset=True)
    if "alerts" in update_data and update_data["alerts"] is not None:
        update_data["alerts"] = [a.model_dump() if hasattr(a, 'model_dump') else a for a in update_data["alerts"]]
```

Actually, since `model_dump(exclude_unset=True)` on a `TripDayUpdate` containing a list of `DayAlert` Pydantic objects will serialize them to dicts automatically, this step may not be needed. Verify by running the test first.

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_road_trip_fields.py::test_day_alerts_patch tests/test_road_trip_fields.py::test_day_alerts_replace -v
```

Expected: PASS. If alerts aren't deserialized correctly in the response, add a `@field_validator("alerts", mode="before")` or use `model_validator` in `TripDayResponse` to parse the raw JSON.

If the response returns raw dicts (not `DayAlert` objects), Pydantic v2 will coerce them automatically because `DayAlert` is declared in the list type — no extra code needed.

- [ ] **Step 7: Run full suite**

```bash
pytest -q --cov=app tests/
```

- [ ] **Step 8: Commit**

```bash
git add app/models/trip_day.py app/schemas/trip_day.py tests/test_road_trip_fields.py
git commit -m "feat: add alerts JSON column to TripDay model and schema"
```

---

## Task 4: Feature 2 Backend — Transport `waypoints`

**Files:**
- Modify: `app/models/trip_transport.py`
- Modify: `app/schemas/trip_transport.py`

- [ ] **Step 1: Add failing test**

Append to `tests/test_road_trip_fields.py`:

```python
def test_transport_waypoints_create(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    resp = client.post(f"/trips/{trip.id}/transports/", json={
        "transport_type": "drive",
        "origin": "Las Vegas, NV",
        "destination": "Grand Canyon South Rim, AZ",
        "departure_day_id": day.id,
        "waypoints": "Hoover Dam\nOatman, AZ",
    })
    assert resp.status_code == 201
    assert "Hoover Dam" in resp.json()["waypoints"]


def test_transport_waypoints_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post(f"/trips/{trip.id}/transports/", json={
        "transport_type": "drive",
        "origin": "A", "destination": "B",
    })
    t_id = create.json()["id"]
    resp = client.patch(f"/transports/{t_id}", json={"waypoints": "Scenic Viewpoint"})
    assert resp.status_code == 200
    assert resp.json()["waypoints"] == "Scenic Viewpoint"
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_road_trip_fields.py::test_transport_waypoints_create -v
```

Expected: FAIL.

- [ ] **Step 3: Add `waypoints` to `TripTransport` model**

In `app/models/trip_transport.py`, add after `extra`:

```python
    waypoints = Column(Text, nullable=True)
```

- [ ] **Step 4: Add `waypoints` to transport schemas**

In `app/schemas/trip_transport.py`:

In `TripTransportBase`, add:
```python
    waypoints: str | None = None
```

In `TripTransportUpdate`, add:
```python
    waypoints: str | None = None
```

`TripTransportCreate` inherits from `TripTransportBase`, `TripTransportRead` too — done.

- [ ] **Step 5: Check the transport router creates/patches with extra fields**

The existing transport router uses `model_dump()` to create and `model_dump(exclude_unset=True)` to update. Since `waypoints` is now in both the model and schema, this will work automatically. Verify by running tests.

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_road_trip_fields.py::test_transport_waypoints_create tests/test_road_trip_fields.py::test_transport_waypoints_patch -v
```

Expected: PASS.

- [ ] **Step 7: Run full suite + commit**

```bash
pytest -q --cov=app tests/
git add app/models/trip_transport.py app/schemas/trip_transport.py tests/test_road_trip_fields.py
git commit -m "feat: add waypoints field to TripTransport model and schema"
```

---

## Task 5: Feature 1 Backend — `PreTripTask` CRUD

**Files:**
- Create: `app/models/pre_trip_task.py`
- Modify: `app/models/trip.py`
- Modify: `app/models/__init__.py`
- Create: `app/schemas/pre_trip_task.py`
- Modify: `app/schemas/__init__.py`
- Create: `app/routers/pre_trip_tasks.py`
- Modify: `app/routers/__init__.py`
- Modify: `app/main.py`
- Create: `tests/test_pre_trip_tasks.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_pre_trip_tasks.py`:

```python
from datetime import date
from app import models


def _make_trip(db, user_id):
    trip = models.Trip(
        name="Southwest Road Trip",
        start_date=date(2030, 9, 1),
        end_date=date(2030, 9, 14),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_create_pre_trip_task(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    resp = client.post(f"/trips/{trip.id}/pre-trip-tasks", json={
        "title": "Book Antelope Canyon Tour",
        "status": "pending",
        "book_by_date": "2030-06-01",
        "url": "https://example.com/book",
        "cost": 85.0,
        "currency": "USD",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Book Antelope Canyon Tour"
    assert data["status"] == "pending"
    assert data["trip_id"] == trip.id


def test_list_pre_trip_tasks(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    client.post(f"/trips/{trip.id}/pre-trip-tasks", json={"title": "Task A", "status": "pending"})
    client.post(f"/trips/{trip.id}/pre-trip-tasks", json={"title": "Task B", "status": "booked"})
    resp = client.get(f"/trips/{trip.id}/pre-trip-tasks")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_patch_pre_trip_task_status(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    create = client.post(f"/trips/{trip.id}/pre-trip-tasks", json={"title": "Buy Pass", "status": "pending"})
    task_id = create.json()["id"]
    resp = client.patch(f"/pre-trip-tasks/{task_id}", json={"status": "booked"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "booked"


def test_delete_pre_trip_task(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    create = client.post(f"/trips/{trip.id}/pre-trip-tasks", json={"title": "Permits", "status": "pending"})
    task_id = create.json()["id"]
    resp = client.delete(f"/pre-trip-tasks/{task_id}")
    assert resp.status_code == 204
    # verify gone
    list_resp = client.get(f"/trips/{trip.id}/pre-trip-tasks")
    assert len(list_resp.json()) == 0


def test_pre_trip_tasks_require_auth(unauthenticated_client, db_session):
    resp = unauthenticated_client.get("/trips/1/pre-trip-tasks")
    assert resp.status_code == 401


def test_pre_trip_tasks_cross_trip_isolation(client, test_user, db_session):
    """User cannot access another user's pre-trip tasks."""
    from conftest import create_other_user
    other_user, _ = create_other_user(db_session)
    other_trip = models.Trip(
        name="Other Trip", start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10), status="planning", user_id=other_user.id,
    )
    db_session.add(other_trip)
    db_session.commit()
    db_session.refresh(other_trip)
    resp = client.get(f"/trips/{other_trip.id}/pre-trip-tasks")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run to verify they all fail**

```bash
source .venv/bin/activate && pytest tests/test_pre_trip_tasks.py -v 2>&1 | head -30
```

Expected: all FAIL (router not found, 404s).

- [ ] **Step 3: Create `PreTripTask` model**

Create `app/models/pre_trip_task.py`:

```python
from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .base import Base


class PreTripTask(Base):
    __tablename__ = "pre_trip_tasks"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending|booked|paid
    book_by_date = Column(Date, nullable=True)
    url = Column(Text, nullable=True)
    cost = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trip = relationship("Trip", back_populates="pre_trip_tasks")
```

- [ ] **Step 4: Add relationship to `Trip` model**

In `app/models/trip.py`, add at the end of the class body:

```python
    pre_trip_tasks = relationship(
        "PreTripTask", back_populates="trip", cascade="all, delete-orphan"
    )
```

- [ ] **Step 5: Register model in `models/__init__.py`**

Add to `app/models/__init__.py`:

```python
from .pre_trip_task import PreTripTask
```

And add `"PreTripTask"` to the `__all__` list.

- [ ] **Step 6: Create schemas**

Create `app/schemas/pre_trip_task.py`:

```python
import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

PreTripTaskStatus = Literal["pending", "booked", "paid"]


class PreTripTaskBase(BaseModel):
    title: str
    description: str | None = None
    status: PreTripTaskStatus = "pending"
    book_by_date: datetime.date | None = None
    url: str | None = None
    cost: float | None = None
    currency: str | None = None
    sort_order: int = 0


class PreTripTaskCreate(PreTripTaskBase):
    pass


class PreTripTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: PreTripTaskStatus | None = None
    book_by_date: datetime.date | None = None
    url: str | None = None
    cost: float | None = None
    currency: str | None = None
    sort_order: int | None = None


class PreTripTaskRead(PreTripTaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    created_at: datetime.datetime
```

- [ ] **Step 7: Register in `schemas/__init__.py`**

Add to `app/schemas/__init__.py`:

```python
from .pre_trip_task import *  # noqa: F401, F403
```

- [ ] **Step 8: Create the router**

Create `app/routers/pre_trip_tasks.py`:

```python
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from database import get_db

router = APIRouter(tags=["pre-trip-tasks"])


def _check_trip_access(
    trip_id: int, db: Session, user: models.User, require_owner: bool = False
) -> models.Trip:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id == user.id:
        return trip
    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == user.id,
            )
            .first()
        )
        if share:
            return trip
    raise HTTPException(status_code=404, detail="Trip not found")


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
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    return (
        db.query(models.PreTripTask)
        .filter(models.PreTripTask.trip_id == trip_id)
        .order_by(models.PreTripTask.sort_order, models.PreTripTask.created_at)
        .all()
    )


@router.post(
    "/trips/{trip_id}/pre-trip-tasks",
    response_model=schemas.PreTripTaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_pre_trip_task(
    trip_id: int,
    task: schemas.PreTripTaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user, require_owner=True)
    db_task = models.PreTripTask(trip_id=trip_id, **task.model_dump())
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
    _check_trip_access(task.trip_id, db, current_user, require_owner=True)
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
    _check_trip_access(task.trip_id, db, current_user, require_owner=True)
    db.delete(task)
    db.commit()
```

- [ ] **Step 9: Register in `routers/__init__.py`**

Add to `app/routers/__init__.py`:

```python
from .pre_trip_tasks import router as pre_trip_tasks_router
```

Add `"pre_trip_tasks_router"` to `__all__`.

- [ ] **Step 10: Register in `main.py`**

In `app/main.py`, add to the import block:

```python
    pre_trip_tasks_router,
```

In `create_app()`, add:

```python
    app.include_router(pre_trip_tasks_router)
```

- [ ] **Step 11: Run tests**

```bash
pytest tests/test_pre_trip_tasks.py -v
```

Expected: all 6 PASS.

- [ ] **Step 12: Run full suite + commit**

```bash
pytest -q --cov=app tests/
git add app/models/pre_trip_task.py app/models/trip.py app/models/__init__.py \
        app/schemas/pre_trip_task.py app/schemas/__init__.py \
        app/routers/pre_trip_tasks.py app/routers/__init__.py \
        app/main.py tests/test_pre_trip_tasks.py
git commit -m "feat: add PreTripTask model, schemas, and CRUD router"
```

---

## Task 6: Dashboard Extension — `pre_trip_task` + `activity_deadline` Action Items

**Files:**
- Modify: `app/schemas/dashboard.py`
- Modify: `app/services/dashboard_service.py`
- Create: `tests/test_dashboard_road_trip.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_dashboard_road_trip.py`:

```python
from datetime import date, timedelta
from app import models


def _make_upcoming_trip(db, user_id, days_away=30):
    start = date.today() + timedelta(days=days_away)
    trip = models.Trip(
        name="Road Trip",
        start_date=start,
        end_date=start + timedelta(days=13),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_dashboard_pre_trip_task_action_item(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    deadline = (date.today() + timedelta(days=15)).isoformat()
    db_task = models.PreTripTask(
        trip_id=trip.id,
        title="Book Antelope Canyon",
        status="pending",
        book_by_date=date.today() + timedelta(days=15),
    )
    db_session.add(db_task)
    db_session.commit()

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    items = resp.json()["action_items"]
    types = [i["type"] for i in items]
    assert "pre_trip_task" in types
    task_item = next(i for i in items if i["type"] == "pre_trip_task")
    assert "Antelope Canyon" in task_item["detail"]


def test_dashboard_activity_deadline_action_item(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    day = models.TripDay(trip_id=trip.id, date=trip.start_date, sort_order=0)
    db_session.add(day)
    db_session.commit()
    db_session.refresh(day)

    activity = models.DayActivity(
        day_id=day.id,
        title="Zion Narrows Permit",
        booked=False,
        book_by_date=date.today() + timedelta(days=20),
        sort_order=0,
    )
    db_session.add(activity)
    db_session.commit()

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    items = resp.json()["action_items"]
    types = [i["type"] for i in items]
    assert "activity_deadline" in types
    act_item = next(i for i in items if i["type"] == "activity_deadline")
    assert "Narrows" in act_item["detail"]


def test_dashboard_no_action_for_booked_activity(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    day = models.TripDay(trip_id=trip.id, date=trip.start_date, sort_order=0)
    db_session.add(day)
    db_session.commit()
    db_session.refresh(day)

    # Already booked — should NOT appear in action items
    activity = models.DayActivity(
        day_id=day.id,
        title="Already Booked Tour",
        booked=True,
        book_by_date=date.today() + timedelta(days=20),
        sort_order=0,
    )
    db_session.add(activity)
    db_session.commit()

    resp = client.get("/api/dashboard")
    items = resp.json()["action_items"]
    assert not any(i["type"] == "activity_deadline" for i in items)
```

- [ ] **Step 2: Run to verify failures**

```bash
pytest tests/test_dashboard_road_trip.py -v 2>&1 | head -40
```

Expected: FAIL (unknown action item types, validation errors).

- [ ] **Step 3: Extend `ActionItemType` in dashboard schema**

In `app/schemas/dashboard.py`, update the Literal and add `day_id` to `DashboardActionItem`:

```python
ActionItemType = Literal["booking", "packing", "budget", "deadline", "pre_trip_task", "activity_deadline"]
```

Also add an optional `day_id` field to `DashboardActionItem` for linking activity_deadline items to their day:

```python
class DashboardActionItem(BaseModel):
    type: ActionItemType
    title: str
    trip_name: str
    trip_id: int
    urgency: ActionItemUrgency
    detail: str
    day_id: Optional[int] = None
```

- [ ] **Step 4: Add action item logic to dashboard service**

In `app/services/dashboard_service.py`, add these two blocks inside `_get_action_items_for_trip`, after the existing "Deadline: expenses" block:

```python
    # Pre-trip tasks: pending tasks with approaching book_by_date (within 30 days)
    task_window = today + timedelta(days=30)
    pending_tasks = (
        db.query(models.PreTripTask)
        .filter(
            models.PreTripTask.trip_id == trip.id,
            models.PreTripTask.status == "pending",
            models.PreTripTask.book_by_date.isnot(None),
            models.PreTripTask.book_by_date >= today,
            models.PreTripTask.book_by_date <= task_window,
        )
        .order_by(models.PreTripTask.book_by_date)
        .all()
    )
    for task in pending_tasks:
        days_until = (task.book_by_date - today).days
        urgency = _urgency_from_days(days_until)
        items.append(
            schemas.DashboardActionItem(
                type="pre_trip_task",
                title=task.title,
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=urgency,
                detail=f"Book by {task.book_by_date.isoformat()}",
            )
        )

    # Activity deadlines: unbooked activities with approaching book_by_date (within 30 days)
    activity_window = today + timedelta(days=30)
    deadline_activities = (
        db.query(models.DayActivity)
        .join(models.TripDay, models.DayActivity.day_id == models.TripDay.id)
        .filter(
            models.TripDay.trip_id == trip.id,
            models.DayActivity.booked.is_(False),
            models.DayActivity.book_by_date.isnot(None),
            models.DayActivity.book_by_date >= today,
            models.DayActivity.book_by_date <= activity_window,
        )
        .order_by(models.DayActivity.book_by_date)
        .all()
    )
    for activity in deadline_activities:
        days_until = (activity.book_by_date - today).days
        urgency = _urgency_from_days(days_until)
        items.append(
            schemas.DashboardActionItem(
                type="activity_deadline",
                title=activity.title,
                trip_name=trip.name,
                trip_id=trip.id,
                urgency=urgency,
                detail=f"{activity.title} — book by {activity.book_by_date.isoformat()}",
                day_id=activity.day_id,
            )
        )
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_dashboard_road_trip.py -v
```

Expected: all 3 PASS.

- [ ] **Step 6: Run full suite + commit**

```bash
pytest -q --cov=app tests/
git add app/schemas/dashboard.py app/services/dashboard_service.py tests/test_dashboard_road_trip.py
git commit -m "feat: extend dashboard action items with pre_trip_task and activity_deadline types"
```

---

## Task 7: Frontend Types + API Client

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Update `types.ts`**

Find the `DayActivity` interface and add `book_by_date`:

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
  latitude?: number;
  longitude?: number;
  book_by_date?: string | null;  // ← new
}
```

Add `DayAlert` and update `TripDay` — find the `TripDay` interface and replace it:

```typescript
export interface DayAlert {
  text: string;
  severity: 'warning' | 'info' | 'tip';
}

export interface TripDay {
  id: number;
  trip_id: number;
  date: string;
  title?: string;
  location?: string;
  notes?: string;
  sort_order: number;
  destination_id?: number | null;
  activities?: DayActivity[];
  transports?: TripTransport[];
  alerts?: DayAlert[] | null;  // ← new
}
```

Find `TripTransport` and add `waypoints`:

```typescript
export interface TripTransport {
  // ... existing fields ...
  extra?: Record<string, unknown>;
  options?: TransportOption[];
  waypoints?: string | null;  // ← new
}
```

Also add `waypoints` to `TripTransportCreate`:

```typescript
export interface TripTransportCreate {
  // ... existing fields ...
  extra?: Record<string, unknown>;
  waypoints?: string | null;  // ← new
}
```

Update `TripDayCreate` to include `alerts` (required so `dayApi.updateDay` accepts alerts in Task 10):

```typescript
export interface TripDayCreate {
  trip_id: number;
  date: string;
  title?: string;
  location?: string;
  notes?: string;
  destination_id?: number | null;
  alerts?: DayAlert[] | null;  // ← new
}
```

Add `PreTripTask` types after the accommodation types:

```typescript
export type PreTripTaskStatus = 'pending' | 'booked' | 'paid';

export interface PreTripTask {
  id: number;
  trip_id: number;
  title: string;
  description?: string | null;
  status: PreTripTaskStatus;
  book_by_date?: string | null;
  url?: string | null;
  cost?: number | null;
  currency?: string | null;
  sort_order: number;
  created_at: string;
}

export interface PreTripTaskCreate {
  title: string;
  description?: string;
  status?: PreTripTaskStatus;
  book_by_date?: string;
  url?: string;
  cost?: number;
  currency?: string;
  sort_order?: number;
}

export type PreTripTaskUpdate = Partial<PreTripTaskCreate> & { status?: PreTripTaskStatus };
```

Update `DashboardData` action_items type to include new types:

```typescript
  action_items: Array<{
    type: 'booking' | 'packing' | 'budget' | 'deadline' | 'pre_trip_task' | 'activity_deadline';
    title: string;
    trip_name: string;
    trip_id: number;
    urgency: 'low' | 'medium' | 'high';
    detail: string;
    day_id?: number | null;
  }>;
```

- [ ] **Step 2: Add pre-trip task API functions to `api.ts`**

Add the import at the top of `api.ts`:

```typescript
import {
  // ... existing imports ...
  PreTripTask,
  PreTripTaskCreate,
  PreTripTaskUpdate,
} from './types';
```

Add the new API object (after `dashboardApi`):

```typescript
export const preTrip = {
  list: (tripId: number) =>
    api.get<PreTripTask[]>(`/trips/${tripId}/pre-trip-tasks`),
  create: (tripId: number, data: PreTripTaskCreate) =>
    api.post<PreTripTask>(`/trips/${tripId}/pre-trip-tasks`, data),
  update: (taskId: number, data: PreTripTaskUpdate) =>
    api.patch<PreTripTask>(`/pre-trip-tasks/${taskId}`, data),
  delete: (taskId: number) =>
    api.delete(`/pre-trip-tasks/${taskId}`),
};
```

Also add `waypoints` to the transport update in `dayApi.updateTransport` if that function exists, or note that `TripTransportCreate` now includes `waypoints` automatically (since the transport form already builds a `TripTransportCreate` payload).

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. Fix any that appear before proceeding.

- [ ] **Step 4: Lint**

```bash
npm run lint
```

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat: extend TypeScript types and API client for road trip features"
```

---

## Task 8: Feature 4 Frontend — ActivityForm + ActivityBlock

**Files:**
- Modify: `frontend/components/days/ActivityForm.tsx`
- Modify: `frontend/components/days/ActivityBlock.tsx`

- [ ] **Step 1: Update `ActivityForm.tsx`**

Add `book_by_date` to default values and form fields. The field shows only when `booked` is false and clears when `booked` becomes true.

Replace the form body. After the existing `booked` checkbox block:

```typescript
// In defaultValues:
defaultValues: {
    title: activity?.title || '',
    category: activity?.category || 'other',
    start_time: activity?.start_time || '10:00',
    end_time: activity?.end_time || '',
    location: activity?.location || '',
    notes: activity?.notes || '',
    cost: activity?.cost || undefined,
    booked: activity?.booked || false,
    book_by_date: activity?.book_by_date || '',
    latitude: activity?.latitude ?? undefined,
    longitude: activity?.longitude ?? undefined,
}
```

Add watchers:

```typescript
    const bookedValue = watch('booked');
    const bookByDateValue = watch('book_by_date');
```

After the booked checkbox block, add the book_by_date field (only rendered when not booked):

```typescript
                    {!bookedValue && (
                        <div>
                            <label htmlFor="activity-book-by-date" className="block text-sm font-semibold text-slate-700 mb-1">
                                Book by date
                            </label>
                            <input
                                id="activity-book-by-date"
                                type="date"
                                {...register('book_by_date')}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                    )}
```

In `onSubmit`, clear `book_by_date` when `booked` is true:

```typescript
    const onSubmit = async (data: Partial<DayActivity>) => {
        setLoading(true);
        const payload = { ...data };
        if (payload.booked) {
            payload.book_by_date = null;
        }
        try {
            if (activity?.id) {
                await onSave({ ...payload, id: activity.id, day_id: dayId });
            } else {
                await onSave({ ...payload, day_id: dayId });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to save activity');
        } finally {
            setLoading(false);
        }
    };
```

- [ ] **Step 2: Update `ActivityBlock.tsx`**

Add an amber "Book by {date}" badge when the activity has an approaching deadline. Add this helper above the component:

```typescript
function isApproachingDeadline(bookByDate: string | null | undefined): boolean {
    if (!bookByDate) return false;
    const deadline = new Date(bookByDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
}
```

Inside the returned JSX, in the top-right area after the `booked` badge, add:

```typescript
                {!activity.booked && isApproachingDeadline(activity.book_by_date) && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center shrink-0 uppercase tracking-widest leading-none ml-1 self-start mt-0.5 bg-amber-50 text-amber-600">
                        Book by {activity.book_by_date}
                    </span>
                )}
```

- [ ] **Step 3: Type-check and lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/components/days/ActivityForm.tsx frontend/components/days/ActivityBlock.tsx
git commit -m "feat: add book_by_date field to ActivityForm and deadline badge to ActivityBlock"
```

---

## Task 9: Feature 2 Frontend — Transport Waypoints

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`
- Modify: `frontend/components/days/TransportBlock.tsx`

- [ ] **Step 1: Update `TransportForm.tsx`**

Add `waypoints` state near the other state declarations (after `notes`):

```typescript
  const [waypoints, setWaypoints] = useState(initialData?.waypoints ?? '');
```

In `handleSubmit`, include `waypoints` in the `data` object:

```typescript
    const data: TripTransportCreate = {
      // ... existing fields ...
      waypoints: type === 'drive' && waypoints ? waypoints : undefined,
    };
```

Add the waypoints textarea inside the route section, only for drive type. After the origin/destination grid, add:

```typescript
          {type === 'drive' && (
            <div>
              <label className={labelCls}>Intermediate stops (one per line)</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={waypoints}
                onChange={e => setWaypoints(e.target.value)}
                placeholder={'Hoover Dam\nOatman, AZ\nSeligman, AZ'}
              />
            </div>
          )}
```

- [ ] **Step 2: Update `TransportBlock.tsx`**

In the departure block JSX, after the existing text content, add waypoints display for drive type:

```typescript
            {transport.transport_type === 'drive' && transport.waypoints && (
                <div className="px-2.5 pb-1.5 -mt-1">
                    {transport.waypoints.split('\n').filter(Boolean).map((stop, i) => (
                        <p key={i} className="text-[11px] text-slate-400 ml-5 leading-tight">
                            ↳ {stop.trim()}
                        </p>
                    ))}
                </div>
            )}
```

Place this after the closing `</div>` of the header row (the div containing the Icon and the text).

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
cd .. && git add frontend/components/transport/TransportForm.tsx frontend/components/days/TransportBlock.tsx
git commit -m "feat: add waypoints textarea for drive type in TransportForm and display in TransportBlock"
```

---

## Task 10: Feature 3 Frontend — Day Alerts

**Files:**
- Modify: `frontend/components/days/DayTimeline.tsx`
- Modify: `frontend/components/days/DayBuilder.tsx`

- [ ] **Step 1: Update `DayTimeline.tsx`**

Add `DayAlert` import and new props to the interface:

```typescript
import { DayActivity, TripTransport, Accommodation, DayAlert } from '@/lib/types';

interface DayTimelineProps {
    scheduled: DayActivity[];
    unscheduled: DayActivity[];
    onEditActivity: (activity: DayActivity) => void;
    transportItems?: TripTransport[];
    currentDayId?: number;
    currentDayDate?: string;
    accommodations?: Accommodation[];
    onEditTransport?: (t: TripTransport) => void;
    highlightedActivityId?: number;
    highlightedItemId?: string | null;
    onItemHover?: (id: string | null) => void;
    alerts?: DayAlert[] | null;            // ← new
    onUpdateAlerts?: (alerts: DayAlert[]) => void;  // ← new
}
```

Add alert severity styles helper above the component:

```typescript
const ALERT_STYLES: Record<DayAlert['severity'], { border: string; bg: string; text: string; label: string }> = {
    warning: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-800', label: 'Warning' },
    info:    { border: 'border-sky-400',   bg: 'bg-sky-50',   text: 'text-sky-800',   label: 'Info'    },
    tip:     { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Tip' },
};
```

Add `useState` for inline alert editing inside `DayTimeline`:

```typescript
import { useState } from 'react';

// inside the component:
const [editingAlertIndex, setEditingAlertIndex] = useState<number | null>(null);
const [newAlertText, setNewAlertText] = useState('');
const [newAlertSeverity, setNewAlertSeverity] = useState<DayAlert['severity']>('warning');
const [showAddAlert, setShowAddAlert] = useState(false);
```

In the component's destructuring, add:

```typescript
    alerts = [],
    onUpdateAlerts,
```

Add the alerts section **before** the `<div className="relative border-l ...">` timeline grid. Insert this JSX block at the top of the returned `<div className="bg-white rounded-2xl ...">`:

```typescript
            {/* Alerts section */}
            {(alerts && alerts.length > 0 || onUpdateAlerts) && (
                <div className="mb-6 space-y-2">
                    {(alerts ?? []).map((alert, i) => {
                        const style = ALERT_STYLES[alert.severity];
                        if (editingAlertIndex === i) {
                            return (
                                <div key={i} className={`flex gap-2 items-start p-3 rounded-lg border-l-4 ${style.border} ${style.bg}`}>
                                    <input
                                        autoFocus
                                        className="flex-1 text-sm bg-transparent outline-none border-b border-slate-300"
                                        value={alert.text}
                                        onChange={e => {
                                            const updated = [...(alerts ?? [])];
                                            updated[i] = { ...alert, text: e.target.value };
                                            onUpdateAlerts?.(updated);
                                        }}
                                        onBlur={() => setEditingAlertIndex(null)}
                                    />
                                    <button
                                        className="text-xs text-slate-400 hover:text-red-500 ml-2"
                                        onClick={() => {
                                            const updated = (alerts ?? []).filter((_, j) => j !== i);
                                            onUpdateAlerts?.(updated);
                                            setEditingAlertIndex(null);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={i}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border-l-4 ${style.border} ${style.bg} cursor-pointer`}
                                onClick={() => onUpdateAlerts && setEditingAlertIndex(i)}
                            >
                                <span className={`text-xs font-bold uppercase tracking-widest mt-0.5 shrink-0 ${style.text}`}>{style.label}</span>
                                <p className={`text-sm ${style.text}`}>{alert.text}</p>
                            </div>
                        );
                    })}

                    {onUpdateAlerts && !showAddAlert && (
                        <button
                            className="text-xs text-slate-400 hover:text-slate-600 mt-1"
                            onClick={() => setShowAddAlert(true)}
                        >
                            + Add alert
                        </button>
                    )}

                    {onUpdateAlerts && showAddAlert && (
                        <div className="flex gap-2 items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                            <select
                                className="text-xs border border-slate-200 rounded p-1"
                                value={newAlertSeverity}
                                onChange={e => setNewAlertSeverity(e.target.value as DayAlert['severity'])}
                            >
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="tip">Tip</option>
                            </select>
                            <input
                                autoFocus
                                className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1"
                                placeholder="Alert text..."
                                value={newAlertText}
                                onChange={e => setNewAlertText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && newAlertText.trim()) {
                                        onUpdateAlerts?.([...(alerts ?? []), { text: newAlertText.trim(), severity: newAlertSeverity }]);
                                        setNewAlertText('');
                                        setShowAddAlert(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setShowAddAlert(false);
                                        setNewAlertText('');
                                    }
                                }}
                            />
                            <button
                                className="text-xs text-slate-500 px-2 py-1 border border-slate-200 rounded hover:bg-slate-100"
                                onClick={() => {
                                    if (newAlertText.trim()) {
                                        onUpdateAlerts?.([...(alerts ?? []), { text: newAlertText.trim(), severity: newAlertSeverity }]);
                                        setNewAlertText('');
                                    }
                                    setShowAddAlert(false);
                                }}
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>
            )}
```

- [ ] **Step 2: Update `DayBuilder.tsx`**

In `DayBuilder`, add a handler for alert updates after the other handlers:

```typescript
    const handleUpdateAlerts = async (newAlerts: DayAlert[]) => {
        try {
            await dayApi.updateDay(day.id, { alerts: newAlerts });
            onRefresh();
        } catch (e) {
            console.error('Failed to update alerts', e);
        }
    };
```

Pass `alerts` and `onUpdateAlerts` to `<DayTimeline>`:

```typescript
                    <DayTimeline
                        scheduled={scheduled}
                        unscheduled={unscheduled}
                        onEditActivity={openEditForm}
                        transportItems={transportItems}
                        currentDayId={day.id}
                        currentDayDate={day.date}
                        accommodations={accommodations}
                        onEditTransport={...}
                        highlightedActivityId={highlightedActivityId}
                        highlightedItemId={hoveredItemId}
                        onItemHover={setHoveredItemId}
                        alerts={day.alerts}
                        onUpdateAlerts={handleUpdateAlerts}
                    />
```

Import `DayAlert` and `dayApi` at the top of `DayBuilder.tsx`:

```typescript
import { DayActivity, TripDay, TripTransport, TripTransportCreate, TripTransportUpdate, Destination, DayAlert } from '@/lib/types';
import { dayApi, tripApi, destinationApi } from '@/lib/api';
```

- [ ] **Step 3: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
cd .. && git add frontend/components/days/DayTimeline.tsx frontend/components/days/DayBuilder.tsx
git commit -m "feat: add day-level alerts panel to DayTimeline with inline add/edit/delete"
```

---

## Task 11: Feature 1 Frontend — PreTripTask Components

**Files:**
- Create: `frontend/components/pre-trip-tasks/usePreTripTasks.ts`
- Create: `frontend/components/pre-trip-tasks/PreTripTaskRow.tsx`
- Create: `frontend/components/pre-trip-tasks/PreTripTaskList.tsx`
- Create: `frontend/components/pre-trip-tasks/index.ts`

- [ ] **Step 1: Create `usePreTripTasks.ts`**

Create `frontend/components/pre-trip-tasks/usePreTripTasks.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PreTripTask, PreTripTaskCreate, PreTripTaskUpdate, PreTripTaskStatus } from '@/lib/types';
import { preTrip } from '@/lib/api';

export function usePreTripTasks(tripId: number) {
    const [tasks, setTasks] = useState<PreTripTask[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        try {
            const res = await preTrip.list(tripId);
            setTasks(res.data);
        } catch (e) {
            console.error('Failed to load pre-trip tasks', e);
        } finally {
            setLoading(false);
        }
    }, [tripId]);

    useEffect(() => { reload(); }, [reload]);

    const createTask = async (data: PreTripTaskCreate) => {
        const res = await preTrip.create(tripId, data);
        setTasks(prev => [...prev, res.data]);
        return res.data;
    };

    const updateTask = async (taskId: number, data: PreTripTaskUpdate) => {
        const res = await preTrip.update(taskId, data);
        setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        return res.data;
    };

    const cycleStatus = async (task: PreTripTask) => {
        const cycle: Record<PreTripTaskStatus, PreTripTaskStatus> = {
            pending: 'booked',
            booked: 'paid',
            paid: 'pending',
        };
        await updateTask(task.id, { status: cycle[task.status] });
    };

    const deleteTask = async (taskId: number) => {
        await preTrip.delete(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    return { tasks, loading, createTask, updateTask, cycleStatus, deleteTask, reload };
}
```

- [ ] **Step 2: Create `PreTripTaskRow.tsx`**

Create `frontend/components/pre-trip-tasks/PreTripTaskRow.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { PreTripTask, PreTripTaskUpdate } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface PreTripTaskRowProps {
    task: PreTripTask;
    onCycleStatus: (task: PreTripTask) => void;
    onUpdate: (taskId: number, data: PreTripTaskUpdate) => void;
    onDelete: (taskId: number) => void;
}

const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-700',
    booked:  'bg-sky-100 text-sky-700',
    paid:    'bg-emerald-100 text-emerald-700',
};

export function PreTripTaskRow({ task, onCycleStatus, onUpdate, onDelete }: PreTripTaskRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <button
                    type="button"
                    className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
                    onClick={e => { e.stopPropagation(); onCycleStatus(task); }}
                    title="Click to advance status"
                >
                    {task.status}
                </button>
                <p className="flex-1 text-sm font-medium text-slate-800 truncate">{task.title}</p>
                {task.book_by_date && (
                    <span className="text-xs text-slate-400 shrink-0">by {task.book_by_date}</span>
                )}
                <span className="text-slate-300 text-sm">{expanded ? '▲' : '▼'}</span>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/50">
                    {task.description && (
                        <p className="text-sm text-slate-600">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {task.url && (
                            <a
                                href={task.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sky-600 hover:underline"
                                onClick={e => e.stopPropagation()}
                            >
                                <ExternalLink className="w-3 h-3" /> Book link
                            </a>
                        )}
                        {task.cost != null && (
                            <span>Est. {task.currency || ''} {task.cost.toFixed(2)}</span>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="text-xs text-rose-400 hover:text-rose-600"
                            onClick={() => onDelete(task.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Create `PreTripTaskList.tsx`**

Create `frontend/components/pre-trip-tasks/PreTripTaskList.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { PreTripTaskRow } from './PreTripTaskRow';
import { usePreTripTasks } from './usePreTripTasks';

interface PreTripTaskListProps {
    tripId: number;
}

export function PreTripTaskList({ tripId }: PreTripTaskListProps) {
    const { tasks, loading, createTask, cycleStatus, updateTask, deleteTask } = usePreTripTasks(tripId);
    const [expanded, setExpanded] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newBookBy, setNewBookBy] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            await createTask({
                title: newTitle.trim(),
                book_by_date: newBookBy || undefined,
                url: newUrl || undefined,
                status: 'pending',
            });
            setNewTitle('');
            setNewBookBy('');
            setNewUrl('');
            setShowAddForm(false);
        } finally {
            setSaving(false);
        }
    };

    const pendingCount = tasks.filter(t => t.status === 'pending').length;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Before you go</h3>
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expanded && (
                <div className="px-6 pb-6 space-y-2">
                    {loading && <p className="text-sm text-slate-400">Loading...</p>}
                    {!loading && tasks.length === 0 && !showAddForm && (
                        <p className="text-sm text-slate-400 italic">No pre-trip tasks yet.</p>
                    )}
                    {tasks.map(task => (
                        <PreTripTaskRow
                            key={task.id}
                            task={task}
                            onCycleStatus={cycleStatus}
                            onUpdate={updateTask}
                            onDelete={deleteTask}
                        />
                    ))}

                    {showAddForm ? (
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                            <input
                                autoFocus
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                placeholder="Task title (e.g. Book Antelope Canyon Tour)"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                    value={newBookBy}
                                    onChange={e => setNewBookBy(e.target.value)}
                                    placeholder="Book by date"
                                />
                                <input
                                    type="url"
                                    className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                                    value={newUrl}
                                    onChange={e => setNewUrl(e.target.value)}
                                    placeholder="Booking URL"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    disabled={saving || !newTitle.trim()}
                                    className="text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 px-4 py-1.5 rounded-lg disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Add task'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mt-1"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus className="w-4 h-4" /> Add task
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Create barrel export**

Create `frontend/components/pre-trip-tasks/index.ts`:

```typescript
export { PreTripTaskList } from './PreTripTaskList';
export { PreTripTaskRow } from './PreTripTaskRow';
export { usePreTripTasks } from './usePreTripTasks';
```

- [ ] **Step 5: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
cd .. && git add frontend/components/pre-trip-tasks/
git commit -m "feat: add PreTripTask components (usePreTripTasks, PreTripTaskRow, PreTripTaskList)"
```

---

## Task 12: Trip Page "Before you go" Panel

**Files:**
- Modify: `frontend/app/trips/[id]/page.tsx`

- [ ] **Step 1: Import and render `PreTripTaskList`**

In `frontend/app/trips/[id]/page.tsx`, add the import at the top with the other component imports:

```typescript
import { PreTripTaskList } from '@/components/pre-trip-tasks';
```

Find the `<TripOverviewDashboard ... />` block (around line 154). Insert `<PreTripTaskList>` **between** the `TripOverviewDashboard` closing tag and the `<div className="mt-6" data-testid="main-content">` tab navigation div:

```typescript
          <TripOverviewDashboard
            trip={trip}
            onEdit={...}
            onShare={...}
            onSettings={...}
          />

          {/* Before you go — always visible, above tabs */}
          {trip.is_owner !== false && (
            <div className="mt-6">
              <PreTripTaskList tripId={tripId} />
            </div>
          )}

          {/* Tab navigation */}
          <div className="mt-6" data-testid="main-content">
```

The `trip.is_owner !== false` guard hides the panel for read-only shared views (shared users cannot create/update tasks since the router requires owner access).

- [ ] **Step 2: Type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/app/trips/[id]/page.tsx
git commit -m "feat: add PreTripTaskList 'Before you go' panel to trip page"
```

---

## Task 13: Dashboard `ActionItemsList` Extension

**Files:**
- Modify: `frontend/components/dashboard/ActionItemsList.tsx`

- [ ] **Step 1: Extend `typeMeta` and link to correct day view**

In `ActionItemsList.tsx`, update the `typeMeta` object and add a `getHref` helper:

```typescript
import Link from 'next/link';
import { AlertTriangle, ClipboardCheck, ClipboardList, Package, Ticket, Calendar, Clock } from 'lucide-react';
import { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface ActionItemsListProps {
  items: DashboardData['action_items'];
}

const typeMeta = {
  booking:           { icon: Ticket,        label: 'Booking'  },
  packing:           { icon: Package,       label: 'Packing'  },
  budget:            { icon: AlertTriangle, label: 'Budget'   },
  deadline:          { icon: ClipboardList, label: 'Deadline' },
  pre_trip_task:     { icon: Calendar,      label: 'Pre-trip' },
  activity_deadline: { icon: Clock,         label: 'Deadline' },
};

function getItemHref(item: DashboardData['action_items'][0]): string {
  if (item.type === 'activity_deadline' && item.day_id) {
    return `/trips/${item.trip_id}/days/${item.day_id}`;
  }
  return `/trips/${item.trip_id}`;
}
```

Update the render to use `getItemHref`:

```typescript
              <Link
                key={`${item.trip_id}-${item.type}-${index}`}
                href={getItemHref(item)}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
```

And the Icon lookup:

```typescript
                const meta = typeMeta[item.type] ?? typeMeta.deadline;
                const Icon = meta.icon;
```

- [ ] **Step 2: Type-check + lint + commit**

```bash
cd frontend && npx tsc --noEmit && npm run lint
cd .. && git add frontend/components/dashboard/ActionItemsList.tsx
git commit -m "feat: extend dashboard ActionItemsList with pre_trip_task and activity_deadline item types"
```

---

## Final Verification

- [ ] **Run backend tests**

```bash
source .venv/bin/activate && pytest -q --cov=app tests/
```

Expected: all pass.

- [ ] **Run frontend type-check + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Manual smoke test**

Start both servers:

```bash
# Terminal 1
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Verify:
1. `/trips/{id}` shows "Before you go" panel; can add a pending task, cycle it to booked → paid
2. Day view shows alerts panel; can add a warning alert, edit it, delete it
3. Transport form with "Drive" type shows "Intermediate stops" textarea; saved stops appear in `TransportBlock` on the day timeline
4. Activity form shows "Book by date" field when booked=false; field disappears and clears when booked checkbox is checked; amber badge appears on ActivityBlock when deadline ≤ 30 days away
5. Dashboard shows `pre_trip_task` and `activity_deadline` action items with correct links
