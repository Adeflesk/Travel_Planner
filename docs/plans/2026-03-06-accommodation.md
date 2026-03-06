# Accommodation Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add accommodation as a first-class model linked to destinations, with expense auto-sync and day-builder badges.

**Architecture:** Destination-scoped `Accommodation` model with CRUD API, expense sync via a service layer, and a new `components/accommodations/` feature directory. Day builder reads a trip-level accommodation list to render contextual check-in/stay/check-out badges.

**Tech Stack:** Python 3.13 + FastAPI + SQLAlchemy (backend); Next.js 14 + TypeScript + Tailwind (frontend); Vitest for unit tests.

---

## Task 1: SQLAlchemy Model

**Files:**
- Create: `app/models/accommodation.py`
- Modify: `app/models/__init__.py`
- Modify: `app/models/destination.py`
- Modify: `app/models/expense.py`

**Step 1: Create the model file**

```python
# app/models/accommodation.py
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class Accommodation(Base):
    __tablename__ = "accommodations"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(
        Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False
    )
    trip_id = Column(
        Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    expense_id = Column(
        Integer, ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True
    )

    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    cost = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    confirmation_number = Column(String(200), nullable=True)
    booking_url = Column(Text, nullable=True)
    contact_phone = Column(String(50), nullable=True)
    cancellation_policy = Column(Text, nullable=True)
    cancel_by_date = Column(Date, nullable=True)
    booked = Column(Boolean, nullable=False, default=False)
    paid = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    destination = relationship("Destination", back_populates="accommodations")
    trip = relationship("Trip", back_populates="accommodations")
    expense = relationship("Expense", foreign_keys=[expense_id])
```

**Step 2: Add relationship to Destination model**

In `app/models/destination.py`, add to the bottom of the class:
```python
    accommodations = relationship(
        "Accommodation", back_populates="destination", cascade="all, delete-orphan"
    )
```

**Step 3: Add relationship to Trip model**

Open `app/models/trip.py`, add to the bottom of the `Trip` class:
```python
    accommodations = relationship(
        "Accommodation", back_populates="trip", cascade="all, delete-orphan"
    )
```

**Step 4: Register in `__init__.py`**

In `app/models/__init__.py`:
- Add `from .accommodation import Accommodation` after the existing imports
- Add `"Accommodation"` to `__all__`

**Step 5: Commit**

```bash
git add app/models/accommodation.py app/models/__init__.py app/models/destination.py app/models/trip.py
git commit -m "feat: add Accommodation SQLAlchemy model"
```

---

## Task 2: Database Migration

**Files:**
- Create: `migrations/add_accommodations_table.py`

**Step 1: Create the migration script**

```python
# migrations/add_accommodations_table.py
"""
Database migration: Create accommodations table

Creates the accommodations table linked to destinations and trips,
with a nullable expense_id for auto-synced expenses.

Usage:
    python migrations/add_accommodations_table.py
"""
import os
import sys
from sqlalchemy import text


def _get_engine():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if project_root not in sys.path:
        sys.path.append(project_root)
    from database import engine
    return engine


def _table_exists(conn, table):
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:table"),
        {"table": table},
    )
    return result.fetchone() is not None


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if _table_exists(conn, "accommodations"):
            print("= accommodations table already exists — skipping")
        else:
            conn.execute(text("""
                CREATE TABLE accommodations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    destination_id INTEGER NOT NULL
                        REFERENCES destinations(id) ON DELETE CASCADE,
                    trip_id INTEGER NOT NULL
                        REFERENCES trips(id) ON DELETE CASCADE,
                    expense_id INTEGER
                        REFERENCES expenses(id) ON DELETE SET NULL,
                    name VARCHAR(200) NOT NULL,
                    address TEXT,
                    check_in_date DATE NOT NULL,
                    check_out_date DATE NOT NULL,
                    cost REAL,
                    currency VARCHAR(10),
                    confirmation_number VARCHAR(200),
                    booking_url TEXT,
                    contact_phone VARCHAR(50),
                    cancellation_policy TEXT,
                    cancel_by_date DATE,
                    booked BOOLEAN NOT NULL DEFAULT FALSE,
                    paid BOOLEAN NOT NULL DEFAULT FALSE,
                    notes TEXT
                )
            """))
            conn.commit()
            print("+ Created accommodations table")
    print("Migration completed successfully!")


def downgrade():
    print(
        "SQLite: DROP TABLE accommodations;\n"
        "PostgreSQL: DROP TABLE accommodations CASCADE;"
    )


if __name__ == "__main__":
    upgrade()
```

**Step 2: Run the migration**

```bash
source .venv/bin/activate
python migrations/add_accommodations_table.py
```

Expected output: `+ Created accommodations table` then `Migration completed successfully!`

**Step 3: Verify the table exists**

```bash
python -c "
from database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
print(inspector.get_columns('accommodations'))
"
```

Expected: list of column dicts including `id`, `name`, `check_in_date`, etc.

**Step 4: Commit**

```bash
git add migrations/add_accommodations_table.py
git commit -m "feat: add accommodations table migration"
```

---

## Task 3: Pydantic Schemas

**Files:**
- Create: `app/schemas/accommodation.py`
- Modify: `app/schemas/__init__.py`

**Step 1: Create the schema file**

```python
# app/schemas/accommodation.py
from pydantic import BaseModel
from datetime import date as DateType
from typing import Optional


class AccommodationBase(BaseModel):
    name: str
    address: Optional[str] = None
    check_in_date: DateType
    check_out_date: DateType
    cost: Optional[float] = None
    currency: Optional[str] = None
    confirmation_number: Optional[str] = None
    booking_url: Optional[str] = None
    contact_phone: Optional[str] = None
    cancellation_policy: Optional[str] = None
    cancel_by_date: Optional[DateType] = None
    booked: bool = False
    paid: bool = False
    notes: Optional[str] = None


class AccommodationCreate(AccommodationBase):
    destination_id: int
    trip_id: int


class AccommodationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    check_in_date: Optional[DateType] = None
    check_out_date: Optional[DateType] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    confirmation_number: Optional[str] = None
    booking_url: Optional[str] = None
    contact_phone: Optional[str] = None
    cancellation_policy: Optional[str] = None
    cancel_by_date: Optional[DateType] = None
    booked: Optional[bool] = None
    paid: Optional[bool] = None
    notes: Optional[str] = None


class Accommodation(AccommodationBase):
    id: int
    destination_id: int
    trip_id: int
    expense_id: Optional[int] = None

    model_config = {"from_attributes": True}
```

**Step 2: Register in `__init__.py`**

In `app/schemas/__init__.py`, add:
```python
from .accommodation import *  # noqa: F401, F403
```

**Step 3: Commit**

```bash
git add app/schemas/accommodation.py app/schemas/__init__.py
git commit -m "feat: add Accommodation Pydantic schemas"
```

---

## Task 4: Service Layer (CRUD + Expense Sync)

**Files:**
- Create: `app/services/accommodation_service.py`

**Step 1: Create the service**

```python
# app/services/accommodation_service.py
"""
Accommodation CRUD service with expense auto-sync.

When an accommodation has a cost > 0, a linked Expense is automatically
created/updated (category='accommodation'). When cost is cleared or the
accommodation is deleted, the linked expense is removed.
"""
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app import models, schemas


def _sync_expense(
    db: Session,
    accommodation: models.Accommodation,
) -> None:
    """Create, update, or delete the linked expense based on cost."""
    has_cost = accommodation.cost is not None and accommodation.cost > 0

    if has_cost:
        currency = accommodation.currency or "USD"
        if accommodation.expense_id:
            # Update existing
            expense = db.query(models.Expense).filter(
                models.Expense.id == accommodation.expense_id
            ).first()
            if expense:
                expense.amount = Decimal(str(accommodation.cost))
                expense.currency = currency
                expense.description = accommodation.name
                expense.date = accommodation.check_in_date
                expense.booked = accommodation.booked
                expense.paid = accommodation.paid
                db.flush()
                return
        # Create new
        expense = models.Expense(
            trip_id=accommodation.trip_id,
            destination_id=accommodation.destination_id,
            category="accommodation",
            amount=Decimal(str(accommodation.cost)),
            currency=currency,
            description=accommodation.name,
            date=accommodation.check_in_date,
            booked=accommodation.booked,
            paid=accommodation.paid,
        )
        db.add(expense)
        db.flush()
        accommodation.expense_id = expense.id
    else:
        # Remove linked expense if cost was cleared
        if accommodation.expense_id:
            expense = db.query(models.Expense).filter(
                models.Expense.id == accommodation.expense_id
            ).first()
            if expense:
                db.delete(expense)
            accommodation.expense_id = None
        db.flush()


def create_accommodation(
    db: Session,
    data: schemas.AccommodationCreate,
) -> models.Accommodation:
    accommodation = models.Accommodation(**data.model_dump())
    db.add(accommodation)
    db.flush()
    _sync_expense(db, accommodation)
    db.commit()
    db.refresh(accommodation)
    return accommodation


def get_accommodations_by_destination(
    db: Session, destination_id: int
) -> list[models.Accommodation]:
    return (
        db.query(models.Accommodation)
        .filter(models.Accommodation.destination_id == destination_id)
        .order_by(models.Accommodation.check_in_date)
        .all()
    )


def get_accommodations_by_trip(
    db: Session, trip_id: int
) -> list[models.Accommodation]:
    return (
        db.query(models.Accommodation)
        .filter(models.Accommodation.trip_id == trip_id)
        .order_by(models.Accommodation.check_in_date)
        .all()
    )


def update_accommodation(
    db: Session,
    accommodation: models.Accommodation,
    data: schemas.AccommodationUpdate,
) -> models.Accommodation:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(accommodation, key, value)
    db.flush()
    _sync_expense(db, accommodation)
    db.commit()
    db.refresh(accommodation)
    return accommodation


def delete_accommodation(db: Session, accommodation: models.Accommodation) -> None:
    # Delete the linked expense first
    if accommodation.expense_id:
        expense = db.query(models.Expense).filter(
            models.Expense.id == accommodation.expense_id
        ).first()
        if expense:
            db.delete(expense)
    db.delete(accommodation)
    db.commit()
```

**Step 2: Commit**

```bash
git add app/services/accommodation_service.py
git commit -m "feat: add accommodation service with expense sync"
```

---

## Task 5: Backend Tests (Service Layer)

**Files:**
- Create: `tests/test_accommodation_service.py`

**Step 1: Write the tests**

```python
# tests/test_accommodation_service.py
"""Tests for accommodation CRUD and expense sync logic."""
import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app import models, schemas
from app.services.accommodation_service import (
    create_accommodation,
    update_accommodation,
    delete_accommodation,
    get_accommodations_by_destination,
    get_accommodations_by_trip,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    # Minimal required parent records
    user = models.User(email="t@test.com", hashed_password="x", role="user")
    session.add(user)
    session.flush()
    trip = models.Trip(
        user_id=user.id,
        name="Test Trip",
        start_date=date(2030, 6, 1),
        end_date=date(2030, 6, 10),
        status="planning",
    )
    session.add(trip)
    session.flush()
    dest = models.Destination(trip_id=trip.id, name="Paris", order=0)
    session.add(dest)
    session.flush()
    yield session, trip, dest
    session.close()


def _make_data(trip_id, dest_id, **kwargs):
    defaults = dict(
        destination_id=dest_id,
        trip_id=trip_id,
        name="Hotel du Nord",
        check_in_date=date(2030, 6, 1),
        check_out_date=date(2030, 6, 4),
    )
    defaults.update(kwargs)
    return schemas.AccommodationCreate(**defaults)


def test_create_without_cost_does_not_create_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id))
    assert acc.expense_id is None
    assert session.query(models.Expense).count() == 0


def test_create_with_cost_creates_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=150.0, currency="EUR"))
    assert acc.expense_id is not None
    expense = session.query(models.Expense).filter_by(id=acc.expense_id).first()
    assert expense is not None
    assert expense.category == "accommodation"
    assert float(expense.amount) == 150.0
    assert expense.currency == "EUR"
    assert expense.description == "Hotel du Nord"
    assert expense.date == date(2030, 6, 1)


def test_update_adding_cost_creates_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id))
    assert acc.expense_id is None
    acc = update_accommodation(session, acc, schemas.AccommodationUpdate(cost=200.0))
    assert acc.expense_id is not None
    assert session.query(models.Expense).count() == 1


def test_update_removing_cost_deletes_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    assert session.query(models.Expense).count() == 1
    acc = update_accommodation(session, acc, schemas.AccommodationUpdate(cost=None))
    assert acc.expense_id is None
    assert session.query(models.Expense).count() == 0


def test_update_cost_updates_existing_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    expense_id = acc.expense_id
    acc = update_accommodation(session, acc, schemas.AccommodationUpdate(cost=250.0))
    assert acc.expense_id == expense_id  # same expense, not a new one
    expense = session.query(models.Expense).filter_by(id=expense_id).first()
    assert float(expense.amount) == 250.0


def test_delete_removes_linked_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    assert session.query(models.Expense).count() == 1
    delete_accommodation(session, acc)
    assert session.query(models.Expense).count() == 0
    assert session.query(models.Accommodation).count() == 0


def test_get_by_destination(db):
    session, trip, dest = db
    create_accommodation(session, _make_data(trip.id, dest.id, name="A"))
    create_accommodation(session, _make_data(trip.id, dest.id, name="B"))
    results = get_accommodations_by_destination(session, dest.id)
    assert len(results) == 2


def test_get_by_trip(db):
    session, trip, dest = db
    create_accommodation(session, _make_data(trip.id, dest.id))
    results = get_accommodations_by_trip(session, trip.id)
    assert len(results) == 1
```

**Step 2: Run the tests — expect them to FAIL (model/service not yet registered)**

```bash
source .venv/bin/activate
pytest tests/test_accommodation_service.py -v
```

At this point all tests should pass (the model and service are already created in tasks 1 and 4). If any fail, fix before continuing.

**Step 3: Commit**

```bash
git add tests/test_accommodation_service.py
git commit -m "test: add accommodation service unit tests"
```

---

## Task 6: FastAPI Router

**Files:**
- Create: `app/routers/accommodations.py`
- Modify: `app/routers/__init__.py`
- Modify: `app/main.py`

**Step 1: Create the router**

```python
# app/routers/accommodations.py
"""
app/routers/accommodations.py - Accommodation endpoints

CRUD for destination-scoped accommodations.
Trip-level GET for the day builder.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from app.services.accommodation_service import (
    create_accommodation,
    get_accommodations_by_destination,
    get_accommodations_by_trip,
    update_accommodation,
    delete_accommodation,
)
from database import get_db

router = APIRouter()


def _check_trip_access(
    trip_id: int, db: Session, current_user: models.User
) -> models.Trip:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id == current_user.id:
        return trip
    share = (
        db.query(models.TripShare)
        .filter(
            models.TripShare.trip_id == trip_id,
            models.TripShare.user_id == current_user.id,
        )
        .first()
    )
    if share:
        return trip
    raise HTTPException(status_code=404, detail="Trip not found")


def _check_destination(
    destination_id: int, trip_id: int, db: Session
) -> models.Destination:
    dest = (
        db.query(models.Destination)
        .filter(
            models.Destination.id == destination_id,
            models.Destination.trip_id == trip_id,
        )
        .first()
    )
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    return dest


@router.get(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations",
    response_model=List[schemas.Accommodation],
    tags=["accommodations"],
)
def list_accommodations(
    trip_id: int,
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    _check_destination(destination_id, trip_id, db)
    return get_accommodations_by_destination(db, destination_id)


@router.post(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations",
    response_model=schemas.Accommodation,
    status_code=201,
    tags=["accommodations"],
)
def create_accommodation_endpoint(
    trip_id: int,
    destination_id: int,
    data: schemas.AccommodationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    _check_destination(destination_id, trip_id, db)
    data.destination_id = destination_id
    data.trip_id = trip_id
    return create_accommodation(db, data)


@router.put(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations/{accommodation_id}",
    response_model=schemas.Accommodation,
    tags=["accommodations"],
)
def update_accommodation_endpoint(
    trip_id: int,
    destination_id: int,
    accommodation_id: int,
    data: schemas.AccommodationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    acc = (
        db.query(models.Accommodation)
        .filter(
            models.Accommodation.id == accommodation_id,
            models.Accommodation.destination_id == destination_id,
        )
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")
    return update_accommodation(db, acc, data)


@router.delete(
    "/trips/{trip_id}/destinations/{destination_id}/accommodations/{accommodation_id}",
    status_code=204,
    tags=["accommodations"],
)
def delete_accommodation_endpoint(
    trip_id: int,
    destination_id: int,
    accommodation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_trip_access(trip_id, db, current_user)
    acc = (
        db.query(models.Accommodation)
        .filter(
            models.Accommodation.id == accommodation_id,
            models.Accommodation.destination_id == destination_id,
        )
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")
    delete_accommodation(db, acc)
    return None


@router.get(
    "/trips/{trip_id}/accommodations",
    response_model=List[schemas.Accommodation],
    tags=["accommodations"],
)
def list_trip_accommodations(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return all accommodations for a trip (used by day builder for badges)."""
    _check_trip_access(trip_id, db, current_user)
    return get_accommodations_by_trip(db, trip_id)
```

**Step 2: Register in `app/routers/__init__.py`**

Add:
```python
from .accommodations import router as accommodations_router
```
And add `"accommodations_router"` to `__all__`.

**Step 3: Register in `app/main.py`**

Add `accommodations_router` to the import and add:
```python
    app.include_router(accommodations_router)
```
after `app.include_router(destinations_router)`.

**Step 4: Start the server and verify**

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs and confirm the `accommodations` tag appears with 5 endpoints.

**Step 5: Commit**

```bash
git add app/routers/accommodations.py app/routers/__init__.py app/main.py
git commit -m "feat: add accommodation API router"
```

---

## Task 7: Frontend Types and API Client

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`

**Step 1: Add types to `frontend/lib/types.ts`**

Add after the `DestinationAccommodation` interface (around line 274):

```ts
export interface Accommodation {
  id: number;
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked: boolean;
  paid: boolean;
  notes?: string;
  expense_id?: number | null;
}

export interface AccommodationCreate {
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked?: boolean;
  paid?: boolean;
  notes?: string;
}

export type AccommodationUpdate = Partial<AccommodationCreate>;
```

**Step 2: Add `accommodationApi` to `frontend/lib/api.ts`**

Add this import at the top with the other type imports:
```ts
  Accommodation,
  AccommodationCreate,
  AccommodationUpdate,
```

Add the API object before the `export default api` line:

```ts
// Accommodation API
export const accommodationApi = {
  getByDestination: (tripId: number, destinationId: number) =>
    api.get<Accommodation[]>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations`
    ),
  getByTrip: (tripId: number) =>
    api.get<Accommodation[]>(`/trips/${tripId}/accommodations`),
  create: (tripId: number, destinationId: number, data: AccommodationCreate) =>
    api.post<Accommodation>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations`,
      data
    ),
  update: (
    tripId: number,
    destinationId: number,
    id: number,
    data: AccommodationUpdate
  ) =>
    api.put<Accommodation>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations/${id}`,
      data
    ),
  delete: (tripId: number, destinationId: number, id: number) =>
    api.delete(
      `/trips/${tripId}/destinations/${destinationId}/accommodations/${id}`
    ),
};
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Fix any errors before continuing.

**Step 4: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat: add Accommodation types and API client"
```

---

## Task 8: `useAccommodations` Hook

**Files:**
- Create: `frontend/components/accommodations/useAccommodations.ts`

**Step 1: Create the hook**

```ts
// frontend/components/accommodations/useAccommodations.ts
'use client';

import { useState, useCallback } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { accommodationApi } from '@/lib/api';

export function useAccommodations(tripId: number, destinationId: number) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accommodationApi.getByDestination(tripId, destinationId);
      setAccommodations(res.data);
    } catch {
      setAccommodations([]);
    } finally {
      setLoading(false);
    }
  }, [tripId, destinationId]);

  const create = async (data: AccommodationCreate) => {
    await accommodationApi.create(tripId, destinationId, data);
    await load();
  };

  const update = async (id: number, data: AccommodationUpdate) => {
    await accommodationApi.update(tripId, destinationId, id, data);
    await load();
  };

  const remove = async (id: number) => {
    await accommodationApi.delete(tripId, destinationId, id);
    await load();
  };

  return { accommodations, loading, load, create, update, remove };
}
```

**Step 2: Create `useTripAccommodations` for the day builder**

```ts
// frontend/components/accommodations/useTripAccommodations.ts
'use client';

import { useState, useEffect } from 'react';
import { Accommodation } from '@/lib/types';
import { accommodationApi } from '@/lib/api';

export function useTripAccommodations(tripId: number) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);

  useEffect(() => {
    if (!tripId) return;
    accommodationApi.getByTrip(tripId).then((res) => {
      setAccommodations(res.data);
    }).catch(() => {
      setAccommodations([]);
    });
  }, [tripId]);

  /**
   * Returns the accommodation a given date falls within, or null.
   * check_in_date is inclusive, check_out_date is exclusive.
   */
  function getAccommodationForDate(dateStr: string): Accommodation | null {
    return (
      accommodations.find((acc) => {
        return dateStr >= acc.check_in_date && dateStr < acc.check_out_date;
      }) ?? null
    );
  }

  /**
   * Returns badge type for a given date relative to an accommodation.
   */
  function getBadgeType(
    dateStr: string
  ): { type: 'check-in' | 'staying' | 'check-out'; accommodation: Accommodation } | null {
    const acc = accommodations.find((a) => {
      return dateStr >= a.check_in_date && dateStr <= a.check_out_date;
    });
    if (!acc) return null;
    if (dateStr === acc.check_in_date) return { type: 'check-in', accommodation: acc };
    if (dateStr === acc.check_out_date) return { type: 'check-out', accommodation: acc };
    return { type: 'staying', accommodation: acc };
  }

  return { accommodations, getAccommodationForDate, getBadgeType };
}
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/components/accommodations/useAccommodations.ts frontend/components/accommodations/useTripAccommodations.ts
git commit -m "feat: add useAccommodations and useTripAccommodations hooks"
```

---

## Task 9: `AccommodationCard` and `AccommodationForm` Components

**Files:**
- Create: `frontend/components/accommodations/AccommodationCard.tsx`
- Create: `frontend/components/accommodations/AccommodationForm.tsx`

**Step 1: Create `AccommodationCard.tsx`**

```tsx
// frontend/components/accommodations/AccommodationCard.tsx
'use client';

import { Accommodation } from '@/lib/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Home, Edit2, Trash2, Phone, ExternalLink, AlertCircle } from 'lucide-react';

interface AccommodationCardProps {
  accommodation: Accommodation;
  onEdit: (acc: Accommodation) => void;
  onDelete: (id: number) => void;
}

export function AccommodationCard({ accommodation, onEdit, onDelete }: AccommodationCardProps) {
  const nights = differenceInCalendarDays(
    parseISO(accommodation.check_out_date),
    parseISO(accommodation.check_in_date)
  );

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Home className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{accommodation.name}</p>
            {accommodation.address && (
              <p className="text-xs text-gray-500 truncate">{accommodation.address}</p>
            )}
            <p className="text-xs text-gray-600 mt-0.5">
              {accommodation.check_in_date} → {accommodation.check_out_date}
              <span className="ml-1 text-gray-400">({nights} night{nights !== 1 ? 's' : ''})</span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {accommodation.cost != null && (
                <span className="text-xs font-medium text-gray-700">
                  {accommodation.currency || 'USD'} {accommodation.cost.toFixed(2)}
                </span>
              )}
              {accommodation.booked && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Booked</span>
              )}
              {accommodation.paid && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Paid</span>
              )}
              {accommodation.cancel_by_date && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cancel by {accommodation.cancel_by_date}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {accommodation.confirmation_number && (
                <span className="text-xs text-gray-500">
                  Ref: {accommodation.confirmation_number}
                </span>
              )}
              {accommodation.contact_phone && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {accommodation.contact_phone}
                </span>
              )}
              {accommodation.booking_url && (
                <a
                  href={accommodation.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View booking
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(accommodation)}
            className="p-1.5 text-blue-600 hover:text-blue-700"
            aria-label="Edit accommodation"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(accommodation.id)}
            className="p-1.5 text-red-600 hover:text-red-700"
            aria-label="Delete accommodation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create `AccommodationForm.tsx`**

```tsx
// frontend/components/accommodations/AccommodationForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { X } from 'lucide-react';

interface AccommodationFormProps {
  tripId: number;
  destinationId: number;
  editing?: Accommodation | null;
  onSubmit: (data: AccommodationCreate | AccommodationUpdate) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: AccommodationCreate = {
  destination_id: 0,
  trip_id: 0,
  name: '',
  address: '',
  check_in_date: '',
  check_out_date: '',
  cost: undefined,
  currency: 'USD',
  confirmation_number: '',
  booking_url: '',
  contact_phone: '',
  cancellation_policy: '',
  cancel_by_date: '',
  booked: false,
  paid: false,
  notes: '',
};

export function AccommodationForm({
  tripId,
  destinationId,
  editing,
  onSubmit,
  onCancel,
}: AccommodationFormProps) {
  const [form, setForm] = useState<AccommodationCreate>({
    ...EMPTY,
    destination_id: destinationId,
    trip_id: tripId,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        destination_id: destinationId,
        trip_id: tripId,
        name: editing.name,
        address: editing.address ?? '',
        check_in_date: editing.check_in_date,
        check_out_date: editing.check_out_date,
        cost: editing.cost,
        currency: editing.currency ?? 'USD',
        confirmation_number: editing.confirmation_number ?? '',
        booking_url: editing.booking_url ?? '',
        contact_phone: editing.contact_phone ?? '',
        cancellation_policy: editing.cancellation_policy ?? '',
        cancel_by_date: editing.cancel_by_date ?? '',
        booked: editing.booked,
        paid: editing.paid,
        notes: editing.notes ?? '',
      });
    } else {
      setForm({ ...EMPTY, destination_id: destinationId, trip_id: tripId });
    }
  }, [editing, destinationId, tripId]);

  const nights =
    form.check_in_date && form.check_out_date
      ? differenceInCalendarDays(parseISO(form.check_out_date), parseISO(form.check_in_date))
      : null;

  const set = (field: keyof AccommodationCreate, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Strip empty strings before submitting
      const payload: Record<string, unknown> = {};
      (Object.keys(form) as Array<keyof typeof form>).forEach((k) => {
        const v = form[k];
        if (v !== '' && v !== undefined) payload[k] = v;
      });
      await onSubmit(payload as AccommodationCreate);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">
            {editing ? 'Edit Accommodation' : 'Add Accommodation'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Hotel name or Airbnb"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street address (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Check-in / Check-out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.check_in_date}
                onChange={(e) => set('check_in_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.check_out_date}
                onChange={(e) => set('check_out_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {nights !== null && nights > 0 && (
            <p className="text-xs text-blue-600 -mt-2">
              {nights} night{nights !== 1 ? 's' : ''}
            </p>
          )}

          {/* Cost + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost ?? ''}
                onChange={(e) =>
                  set('cost', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input
                value={form.currency ?? 'USD'}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Confirmation + Booking URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmation Number
            </label>
            <input
              value={form.confirmation_number ?? ''}
              onChange={(e) => set('confirmation_number', e.target.value)}
              placeholder="ABC123"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking URL</label>
            <input
              type="url"
              value={form.booking_url ?? ''}
              onChange={(e) => set('booking_url', e.target.value)}
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={form.contact_phone ?? ''}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cancellation Policy + Cancel-by Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Policy
            </label>
            <textarea
              value={form.cancellation_policy ?? ''}
              onChange={(e) => set('cancellation_policy', e.target.value)}
              rows={2}
              placeholder="Free cancellation until..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancel By Date</label>
            <input
              type="date"
              value={form.cancel_by_date ?? ''}
              onChange={(e) => set('cancel_by_date', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Booked / Paid */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.booked}
                onChange={(e) => set('booked', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Booked
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(e) => set('paid', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Paid
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Anything else to remember..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Accommodation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/components/accommodations/AccommodationCard.tsx frontend/components/accommodations/AccommodationForm.tsx
git commit -m "feat: add AccommodationCard and AccommodationForm components"
```

---

## Task 10: `AccommodationList` Component and Barrel Exports

**Files:**
- Create: `frontend/components/accommodations/AccommodationList.tsx`
- Create: `frontend/components/accommodations/index.ts`

**Step 1: Create `AccommodationList.tsx`**

```tsx
// frontend/components/accommodations/AccommodationList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Accommodation, AccommodationCreate, AccommodationUpdate } from '@/lib/types';
import { useAccommodations } from './useAccommodations';
import { AccommodationCard } from './AccommodationCard';
import { AccommodationForm } from './AccommodationForm';
import { Plus } from 'lucide-react';

interface AccommodationListProps {
  tripId: number;
  destinationId: number;
}

export function AccommodationList({ tripId, destinationId }: AccommodationListProps) {
  const { accommodations, loading, load, create, update, remove } = useAccommodations(
    tripId,
    destinationId
  );
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Accommodation | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (data: AccommodationCreate | AccommodationUpdate) => {
    if (editing) {
      await update(editing.id, data as AccommodationUpdate);
    } else {
      await create(data as AccommodationCreate);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (acc: Accommodation) => {
    setEditing(acc);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this accommodation?')) {
      await remove(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="mt-2">
      {loading ? (
        <p className="text-xs text-gray-400 ml-7">Loading...</p>
      ) : (
        <div className="space-y-2">
          {accommodations.map((acc) => (
            <AccommodationCard
              key={acc.id}
              accommodation={acc}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Accommodation
      </button>
      {showForm && (
        <AccommodationForm
          tripId={tripId}
          destinationId={destinationId}
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
```

**Step 2: Create `index.ts`**

```ts
// frontend/components/accommodations/index.ts
export { AccommodationCard } from './AccommodationCard';
export { AccommodationForm } from './AccommodationForm';
export { AccommodationList } from './AccommodationList';
export { useAccommodations } from './useAccommodations';
export { useTripAccommodations } from './useTripAccommodations';
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/components/accommodations/AccommodationList.tsx frontend/components/accommodations/index.ts
git commit -m "feat: add AccommodationList component and barrel exports"
```

---

## Task 11: Wire Into Destination Panel

**Files:**
- Modify: `frontend/components/destinations/DestinationItem.tsx`
- Modify: `frontend/components/destinations/DestinationList.tsx`
- Modify: `frontend/components/destinations/useDestinations.ts` (remove `getAccommodationExpenses`)
- Delete: `frontend/components/destinations/AccommodationInfo.tsx`

**Step 1: Read `useDestinations.ts` first**

Open `frontend/components/destinations/useDestinations.ts` and check how `getAccommodationExpenses` is implemented.

**Step 2: Remove `getAccommodationExpenses` from `useDestinations.ts`**

Delete the `getAccommodationExpenses` function and any expense-filtering logic related to accommodation. Also remove any `tripApi.getAccommodationExpenses` calls.

**Step 3: Update `DestinationItem.tsx`**

Remove the `accommodationExpenses` prop and the `<AccommodationInfo />` import/usage. Add the `AccommodationList`:

```tsx
import { AccommodationList } from '@/components/accommodations';

// Remove: accommodationExpenses prop
// Add tripId prop

// In JSX, replace <AccommodationInfo expenses={accommodationExpenses} /> with:
<AccommodationList tripId={destination.trip_id} destinationId={destination.id} />
```

The `tripId` can come from `destination.trip_id` which is already on the `Destination` type.

**Step 4: Update `DestinationList.tsx`**

Remove `getAccommodationExpenses` from the `useDestinations` destructure and remove the `accommodationExpenses={...}` prop from `<DestinationItem>`.

**Step 5: Delete `AccommodationInfo.tsx`**

```bash
rm frontend/components/destinations/AccommodationInfo.tsx
```

Also remove it from `frontend/components/destinations/index.ts` if exported there.

**Step 6: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Fix all errors before continuing.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire AccommodationList into destination panel, remove AccommodationInfo"
```

---

## Task 12: Day Builder Accommodation Badges

**Files:**
- Identify the day builder day-card component (likely `frontend/components/days/DayList.tsx` or similar)
- Modify it to use `useTripAccommodations`

**Step 1: Find where individual days are rendered in the day builder**

```bash
grep -r "TripDay\|DayCard\|day\.date" frontend/components/days/ --include="*.tsx" -l
```

**Step 2: Read the day card/list component**

Understand how individual day cards are rendered and where the date header is.

**Step 3: Add the accommodation badge component**

Create `frontend/components/accommodations/AccommodationDayBadge.tsx`:

```tsx
// frontend/components/accommodations/AccommodationDayBadge.tsx
'use client';

import { Home } from 'lucide-react';

interface AccommodationDayBadgeProps {
  type: 'check-in' | 'staying' | 'check-out';
  name: string;
}

const config = {
  'check-in': {
    bg: 'bg-green-50 border-green-200 text-green-700',
    label: 'Check-in',
  },
  staying: {
    bg: 'bg-gray-50 border-gray-200 text-gray-500',
    label: 'Staying at',
  },
  'check-out': {
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    label: 'Check-out',
  },
};

export function AccommodationDayBadge({ type, name }: AccommodationDayBadgeProps) {
  const { bg, label } = config[type];
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${bg} w-fit`}>
      <Home className="w-3 h-3 shrink-0" />
      <span className="font-medium">{label}:</span>
      <span className="truncate max-w-[160px]">{name}</span>
    </div>
  );
}
```

Export it from `index.ts`:
```ts
export { AccommodationDayBadge } from './AccommodationDayBadge';
```

**Step 4: Use `useTripAccommodations` in the day builder**

In whichever component manages the list of days (e.g. `DayList.tsx`), add:

```tsx
import { useTripAccommodations, AccommodationDayBadge } from '@/components/accommodations';

// Inside the component:
const { getBadgeType } = useTripAccommodations(tripId);

// When rendering each day card, compute and pass the badge:
const badge = getBadgeType(day.date);
// Render inside the day header area:
{badge && (
  <AccommodationDayBadge type={badge.type} name={badge.accommodation.name} />
)}
```

The badge should appear below the date header, above the timeline.

**Step 5: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add accommodation badges to day builder"
```

---

## Task 13: Manual End-to-End Verification

**Step 1: Start both servers**

```bash
# Terminal 1
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

**Step 2: Verify in the browser**

1. Go to a trip → Destinations tab
2. Expand a destination — confirm "Add Accommodation" button appears
3. Add an accommodation with a cost → confirm it saves and reloads
4. Go to Expenses tab → confirm a new `accommodation` expense was auto-created
5. Edit the accommodation, change the cost → confirm the expense amount updates
6. Delete the accommodation → confirm the expense is also removed
7. Go to the Day Builder → confirm check-in/staying/check-out badges appear on the correct days
8. Remove cost from accommodation → confirm expense is removed from Expenses

**Step 3: Run backend tests**

```bash
source .venv/bin/activate
pytest tests/test_accommodation_service.py -v
```

Expected: all 8 tests pass.

**Step 4: Run frontend lint + types**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete accommodation feature — model, API, UI, expense sync, day builder badges"
```
