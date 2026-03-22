# Exchange Rate Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two exchange rate monitoring pages — a trip-scoped view showing currencies used in a trip, and a global view showing currencies across all trips — each with a rate table and Chart.js historical graph.

**Architecture:** New `rate_snapshots` table records exchange rates every time the cache refreshes. New API endpoints serve current + historical rates per trip and globally. Two new Next.js pages consume these endpoints and render a table + Chart.js line graph. Shared React components (`RateTable`, `RateChart`) are reused by both pages.

**Tech Stack:** Python/FastAPI, SQLAlchemy, Chart.js + react-chartjs-2, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## File Structure

### Backend (new files)
- `app/models/rate_snapshot.py` — SQLAlchemy model for rate snapshots
- `app/schemas/rate_snapshot.py` — Pydantic schemas for rate history API responses
- `app/services/rate_snapshot_service.py` — Service for recording and querying snapshots
- `app/routers/rate_history.py` — New API endpoints for rate history
- `migrations/add_rate_snapshots_table.py` — Database migration

### Backend (modified files)
- `app/models/__init__.py` — Register new model
- `app/routers/__init__.py` — Register new router
- `app/main.py` — Include new router
- `app/services/exchange_rate.py` — Hook snapshot recording into cache refresh
- `app/routers/exchange_rates.py` — Trigger snapshot recording on rate fetch
- `tests/conftest.py` — Add `rate_snapshots` to `tables_to_clean`

### Frontend (new files)
- `frontend/components/exchange-rates/RateTable.tsx` — Currency rate table component
- `frontend/components/exchange-rates/RateChart.tsx` — Chart.js line chart component
- `frontend/components/exchange-rates/index.ts` — Barrel exports
- `frontend/app/trips/[id]/exchange-rates/page.tsx` — Trip-scoped page
- `frontend/app/exchange-rates/page.tsx` — Global page

### Frontend (modified files)
- `frontend/lib/api.ts` — Add rate history API methods
- `frontend/lib/types.ts` — Add TypeScript types for rate snapshots
- `frontend/app/trips/[id]/page.tsx` — Add exchange rates tab
- `frontend/components/Navigation.tsx` — Add global exchange rates nav link
- `frontend/package.json` — Add chart.js + react-chartjs-2 dependencies

### Test files (new)
- `tests/test_rate_snapshot_service.py` — Unit tests for snapshot service
- `tests/test_rate_history_router.py` — API endpoint tests

---

## Scope 1: Backend — Rate Snapshots Model & Migration

**Goal:** Create the `rate_snapshots` table and SQLAlchemy model so we have somewhere to store historical rates.

### Task 1.1: Create the RateSnapshot model

**Files:**
- Create: `app/models/rate_snapshot.py`
- Modify: `app/models/__init__.py`

- [ ] **Step 1: Create the model file**

```python
# app/models/rate_snapshot.py
"""
app/models/rate_snapshot.py - Exchange rate snapshot model

Stores historical exchange rate data points for monitoring and graphing.
Each row records the rate from one currency to another at a specific time.
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from .base import Base


class RateSnapshot(Base):
    __tablename__ = "rate_snapshots"

    id = Column(Integer, primary_key=True)
    base_currency = Column(String(3), nullable=False, index=True)
    target_currency = Column(String(3), nullable=False, index=True)
    rate = Column(Numeric(12, 6), nullable=False)
    fetched_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```

- [ ] **Step 2: Register in models `__init__.py`**

Add to `app/models/__init__.py`:

```python
from .rate_snapshot import RateSnapshot
```

And add `"RateSnapshot"` to the `__all__` list.

- [ ] **Step 3: Verify model loads**

Run:
```bash
source .venv/bin/activate && python -c "from app.models import RateSnapshot; print(RateSnapshot.__tablename__)"
```
Expected: `rate_snapshots`

- [ ] **Step 4: Commit**

```bash
git add app/models/rate_snapshot.py app/models/__init__.py
git commit -m "feat: add RateSnapshot model for exchange rate history"
```

### Task 1.2: Create the migration

**Files:**
- Create: `migrations/add_rate_snapshots_table.py`

- [ ] **Step 1: Write the migration script**

```python
#!/usr/bin/env python
"""
Migration: Create rate_snapshots table for exchange rate history tracking.
"""
import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import text, inspect  # noqa: E402


def _get_engine():
    from database import engine

    return engine


def upgrade():
    engine = _get_engine()

    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "rate_snapshots" in tables:
            print("Table rate_snapshots already exists — skipping.")
            return

        if engine.dialect.name == "sqlite":
            conn.execute(
                text("""
                    CREATE TABLE rate_snapshots (
                        id INTEGER PRIMARY KEY,
                        base_currency VARCHAR(3) NOT NULL,
                        target_currency VARCHAR(3) NOT NULL,
                        rate NUMERIC(12, 6) NOT NULL,
                        fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            )
        else:
            conn.execute(
                text("""
                    CREATE TABLE rate_snapshots (
                        id SERIAL PRIMARY KEY,
                        base_currency VARCHAR(3) NOT NULL,
                        target_currency VARCHAR(3) NOT NULL,
                        rate NUMERIC(12, 6) NOT NULL,
                        fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                """)
            )

        conn.execute(
            text("CREATE INDEX ix_rate_snapshots_base ON rate_snapshots (base_currency)")
        )
        conn.execute(
            text(
                "CREATE INDEX ix_rate_snapshots_target ON rate_snapshots (target_currency)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX ix_rate_snapshots_fetched ON rate_snapshots (fetched_at)"
            )
        )
        conn.commit()
        print("Created rate_snapshots table with indexes.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
```

- [ ] **Step 2: Run the migration**

```bash
source .venv/bin/activate && python migrate.py
```
Expected: `Created rate_snapshots table with indexes.`

- [ ] **Step 3: Verify table exists**

```bash
source .venv/bin/activate && python -c "
from database import engine
from sqlalchemy import inspect
i = inspect(engine)
cols = [c['name'] for c in i.get_columns('rate_snapshots')]
print('Columns:', cols)
"
```
Expected: `Columns: ['id', 'base_currency', 'target_currency', 'rate', 'fetched_at']`

- [ ] **Step 4: Commit**

```bash
git add migrations/add_rate_snapshots_table.py
git commit -m "feat: add rate_snapshots table migration"
```

---

## Scope 2: Backend — Snapshot Recording Service

**Goal:** Build the service that records rate snapshots when the cache refreshes, and queries historical data. Also fix the sync httpx issue while we're modifying the exchange rate service.

### Task 2.1: Create Pydantic schemas for rate history

**Files:**
- Create: `app/schemas/rate_snapshot.py`

- [ ] **Step 1: Write the schemas**

```python
# app/schemas/rate_snapshot.py
"""
Pydantic schemas for exchange rate history responses.
"""

from datetime import datetime
from pydantic import BaseModel


class RatePoint(BaseModel):
    """Single data point for a rate time-series."""
    rate: float
    fetched_at: datetime


class CurrencyRateSummary(BaseModel):
    """Current + historical rate info for one currency pair."""
    base_currency: str
    target_currency: str
    current_rate: float | None
    history: list[RatePoint]


class TripRateSummary(BaseModel):
    """All currency pairs relevant to a trip."""
    trip_base_currency: str
    currencies: list[CurrencyRateSummary]


class GlobalRateSummary(BaseModel):
    """All currency pairs across all user trips."""
    user_base_currency: str
    currencies: list[CurrencyRateSummary]
```

- [ ] **Step 2: Verify schema loads**

```bash
source .venv/bin/activate && python -c "from app.schemas.rate_snapshot import TripRateSummary; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/schemas/rate_snapshot.py
git commit -m "feat: add Pydantic schemas for rate history responses"
```

### Task 2.2: Create the rate snapshot service

**Files:**
- Create: `app/services/rate_snapshot_service.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_rate_snapshot_service.py`:

```python
"""Tests for rate snapshot recording and querying."""
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.rate_snapshot import RateSnapshot
from app.services.rate_snapshot_service import record_snapshots, get_rate_history


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_record_snapshots_inserts_rows(db_session):
    """Recording snapshots should insert one row per target currency."""
    rates = {"EUR": 0.92, "GBP": 0.79, "JPY": 149.5}
    record_snapshots(db_session, "USD", rates, target_currencies=["EUR", "GBP"])

    rows = db_session.query(RateSnapshot).all()
    assert len(rows) == 2
    assert {r.target_currency for r in rows} == {"EUR", "GBP"}
    assert float(rows[0].rate) in [0.92, 0.79]


def test_record_snapshots_skips_if_no_targets(db_session):
    """If no target currencies given, nothing is inserted."""
    rates = {"EUR": 0.92}
    record_snapshots(db_session, "USD", rates, target_currencies=[])

    rows = db_session.query(RateSnapshot).all()
    assert len(rows) == 0


def test_get_rate_history_returns_sorted_points(db_session):
    """History should be returned sorted by fetched_at ascending."""
    now = datetime.now(timezone.utc)
    for i in range(3):
        db_session.add(RateSnapshot(
            base_currency="USD",
            target_currency="EUR",
            rate=Decimal(str(0.90 + i * 0.01)),
            fetched_at=now - timedelta(days=2 - i),
        ))
    db_session.commit()

    history = get_rate_history(
        db_session, "USD", "EUR",
        from_date=now - timedelta(days=3),
        to_date=now + timedelta(days=1),
    )
    assert len(history) == 3
    assert history[0].fetched_at < history[1].fetched_at < history[2].fetched_at


def test_get_rate_history_filters_by_date(db_session):
    """Only snapshots within the date range should be returned."""
    now = datetime.now(timezone.utc)
    db_session.add(RateSnapshot(
        base_currency="USD", target_currency="EUR",
        rate=Decimal("0.90"), fetched_at=now - timedelta(days=10),
    ))
    db_session.add(RateSnapshot(
        base_currency="USD", target_currency="EUR",
        rate=Decimal("0.92"), fetched_at=now - timedelta(days=1),
    ))
    db_session.commit()

    history = get_rate_history(
        db_session, "USD", "EUR",
        from_date=now - timedelta(days=5),
        to_date=now,
    )
    assert len(history) == 1
    assert float(history[0].rate) == pytest.approx(0.92)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate && pytest tests/test_rate_snapshot_service.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.rate_snapshot_service'`

- [ ] **Step 3: Write the service implementation**

Create `app/services/rate_snapshot_service.py`:

```python
"""
app/services/rate_snapshot_service.py - Record and query exchange rate snapshots

Provides functions to persist rate data points in the rate_snapshots table
and retrieve historical time-series for graphing.
"""

import logging
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.rate_snapshot import RateSnapshot

logger = logging.getLogger(__name__)


def record_snapshots(
    db: Session,
    base_currency: str,
    rates: dict[str, float],
    target_currencies: list[str],
) -> int:
    """
    Record rate snapshots for the given currency pairs.

    Only records rates for currencies in *target_currencies* that exist
    in the *rates* dict. Returns the number of rows inserted.
    """
    if not target_currencies or not rates:
        return 0

    count = 0
    for currency in target_currencies:
        rate_value = rates.get(currency)
        if rate_value is None:
            continue
        db.add(RateSnapshot(
            base_currency=base_currency.upper(),
            target_currency=currency.upper(),
            rate=Decimal(str(rate_value)),
        ))
        count += 1

    if count > 0:
        db.commit()
        logger.info("Recorded %d rate snapshots for base %s", count, base_currency)

    return count


def get_rate_history(
    db: Session,
    base_currency: str,
    target_currency: str,
    from_date: datetime,
    to_date: datetime,
) -> list[RateSnapshot]:
    """
    Return rate snapshots for a currency pair within a date range,
    sorted by fetched_at ascending.
    """
    return (
        db.query(RateSnapshot)
        .filter(
            RateSnapshot.base_currency == base_currency.upper(),
            RateSnapshot.target_currency == target_currency.upper(),
            RateSnapshot.fetched_at >= from_date,
            RateSnapshot.fetched_at <= to_date,
        )
        .order_by(RateSnapshot.fetched_at.asc())
        .all()
    )


def get_currencies_used_in_trip(db: Session, trip_id: int) -> list[str]:
    """
    Return distinct expense currencies used in a trip (excluding the trip's base currency).
    """
    from app.models.expense import Expense
    from app.models.trip import Trip

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        return []

    base = (trip.default_currency or "USD").upper()

    rows = (
        db.query(Expense.currency)
        .filter(Expense.trip_id == trip_id)
        .distinct()
        .all()
    )

    return [r[0].upper() for r in rows if r[0] and r[0].upper() != base]


def get_currencies_across_user_trips(db: Session, user_id: int) -> tuple[str, list[str]]:
    """
    Return (user_base_currency, [distinct foreign currencies]) across all
    trips owned by the user.
    """
    from app.models.expense import Expense
    from app.models.trip import Trip
    from app.models.user_settings import UserSettings

    settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == user_id)
        .first()
    )
    user_base = (settings.default_currency if settings else "USD").upper()

    rows = (
        db.query(Expense.currency)
        .join(Trip, Expense.trip_id == Trip.id)
        .filter(Trip.user_id == user_id)
        .distinct()
        .all()
    )

    currencies = [r[0].upper() for r in rows if r[0] and r[0].upper() != user_base]
    return user_base, currencies
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source .venv/bin/activate && pytest tests/test_rate_snapshot_service.py -v
```
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/rate_snapshot_service.py tests/test_rate_snapshot_service.py
git commit -m "feat: add rate snapshot recording and query service"
```

### Task 2.3: Hook snapshot recording into cache refresh

**Files:**
- Modify: `app/services/exchange_rate.py` (lines 42-63)

- [ ] **Step 1: Add snapshot recording call in `get_rates()`**

In `app/services/exchange_rate.py`, after the line `_cache[base] = (time.monotonic(), rates)` (line 62), add snapshot recording. This requires accepting an optional db session and list of target currencies.

Add a new function at the bottom of the file:

```python
def record_rate_snapshots(
    base: str,
    rates: dict[str, float],
    target_currencies: list[str],
) -> None:
    """
    Record rate snapshots after a cache refresh.

    Creates its own DB session so it can be called from the exchange rate
    service without threading a session through get_rates().
    """
    if not target_currencies:
        return
    try:
        from database import SessionLocal
        from app.services.rate_snapshot_service import record_snapshots

        db = SessionLocal()
        try:
            record_snapshots(db, base, rates, target_currencies)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Failed to record rate snapshots: %s", exc)
```

This function is called externally (from the router layer) after fetching rates — keeping `get_rates()` itself side-effect-free.

- [ ] **Step 2: Wire up snapshot recording in the exchange rates router**

In `app/routers/exchange_rates.py`, modify the `get_pair_rate` endpoint to trigger snapshot recording after fetching rates. Add the import at the top:

```python
from app.services.exchange_rate import record_rate_snapshots
```

Then, after the `get_rates()` call returns successfully in the pair endpoint, add:

```python
# Trigger snapshot recording for the requested pair
record_rate_snapshots(from_currency, rates, [to_currency])
```

This ensures snapshots are recorded each time a rate pair is fetched (e.g., when a user selects a currency in the expense form).

- [ ] **Step 3: Verify the existing tests still pass**

```bash
source .venv/bin/activate && pytest tests/test_exchange_rate_service.py -v
```
Expected: All existing tests PASS (we didn't change `get_rates()` itself)

- [ ] **Step 4: Commit**

```bash
git add app/services/exchange_rate.py app/routers/exchange_rates.py
git commit -m "feat: add record_rate_snapshots and wire into pair endpoint"
```

---

## Scope 3: Backend — Rate History API Endpoints

**Goal:** Create API endpoints that serve rate data for the trip-scoped and global pages.

### Task 3.1: Write endpoint tests

**Files:**
- Create: `tests/test_rate_history_router.py`

- [ ] **Step 1: Write the failing tests**

```python
"""Tests for rate history API endpoints."""
import pytest
from unittest.mock import patch


@pytest.fixture
def trip_id(client):
    """Create a test trip and return its ID."""
    response = client.post("/trips/", json={
        "name": "Japan Trip",
        "start_date": "2026-04-01",
        "end_date": "2026-04-14",
        "default_currency": "USD",
    })
    return response.json()["id"]


def test_trip_rate_summary_returns_currencies(client, trip_id):
    """Trip rate summary should list currencies from expenses."""
    # Create an expense in JPY
    client.post("/expenses/", json={
        "trip_id": trip_id,
        "amount": 5000,
        "currency": "JPY",
        "exchange_rate": 0.0067,
        "category": "food",
        "description": "Ramen",
        "date": "2026-04-02",
    })

    with patch("app.services.exchange_rate.get_rates") as mock_rates:
        mock_rates.return_value = {"JPY": 149.5, "EUR": 0.92}
        response = client.get(f"/rate-history/trip/{trip_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["trip_base_currency"] == "USD"
    assert len(data["currencies"]) >= 1
    assert any(c["target_currency"] == "JPY" for c in data["currencies"])


def test_trip_rate_summary_requires_auth(unauthenticated_client, trip_id):
    """Trip rate summary should return 401 without auth."""
    response = unauthenticated_client.get(f"/rate-history/trip/{trip_id}")
    assert response.status_code in (401, 403)


def test_global_rate_summary_returns_data(client, trip_id):
    """Global rate summary should list all currencies across trips."""
    # Create expense in EUR
    client.post("/expenses/", json={
        "trip_id": trip_id,
        "amount": 100,
        "currency": "EUR",
        "exchange_rate": 1.08,
        "category": "transport",
        "description": "Train",
        "date": "2026-04-03",
    })

    with patch("app.services.exchange_rate.get_rates") as mock_rates:
        mock_rates.return_value = {"EUR": 0.92, "GBP": 0.79}
        response = client.get("/rate-history/global")

    assert response.status_code == 200
    data = response.json()
    assert "user_base_currency" in data
    assert "currencies" in data
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate && pytest tests/test_rate_history_router.py -v
```
Expected: FAIL — router not found (404s)

- [ ] **Step 3: Create the rate history router**

Create `app/routers/rate_history.py`:

```python
"""
app/routers/rate_history.py - Rate history and monitoring endpoints
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from app.core.deps import get_current_user
from app import models
from app.routers.expenses import check_trip_access
from app.schemas.rate_snapshot import (
    CurrencyRateSummary,
    GlobalRateSummary,
    RatePoint,
    TripRateSummary,
)
from app.services.exchange_rate import get_rates
from app.services.rate_snapshot_service import (
    get_currencies_across_user_trips,
    get_currencies_used_in_trip,
    get_rate_history,
)

router = APIRouter(prefix="/rate-history", tags=["rate-history"])


def _build_currency_summary(
    db: Session,
    base_currency: str,
    target_currency: str,
    from_date: datetime,
    to_date: datetime,
) -> CurrencyRateSummary:
    """Build a CurrencyRateSummary with current rate + historical data."""
    rates = get_rates(base_currency)
    current_rate = rates.get(target_currency) if rates else None

    snapshots = get_rate_history(db, base_currency, target_currency, from_date, to_date)
    history = [
        RatePoint(rate=float(s.rate), fetched_at=s.fetched_at)
        for s in snapshots
    ]

    return CurrencyRateSummary(
        base_currency=base_currency,
        target_currency=target_currency,
        current_rate=current_rate,
        history=history,
    )


@router.get("/trip/{trip_id}", response_model=TripRateSummary)
def get_trip_rate_summary(
    trip_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return exchange rate summary for all currencies used in a trip.

    Includes current live rate and historical snapshots for the last N days.
    """
    trip = check_trip_access(trip_id, db, current_user)

    base = (trip.default_currency or "USD").upper()
    target_currencies = get_currencies_used_in_trip(db, trip_id)

    now = datetime.now(timezone.utc)
    from_date = now - timedelta(days=days)

    currencies = [
        _build_currency_summary(db, base, tc, from_date, now)
        for tc in target_currencies
    ]

    return TripRateSummary(trip_base_currency=base, currencies=currencies)


@router.get("/global", response_model=GlobalRateSummary)
def get_global_rate_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return exchange rate summary for all currencies across user's trips.

    Uses the user's preferred currency from settings as the base.
    """
    user_base, target_currencies = get_currencies_across_user_trips(
        db, current_user.id
    )

    now = datetime.now(timezone.utc)
    from_date = now - timedelta(days=days)

    currencies = [
        _build_currency_summary(db, user_base, tc, from_date, now)
        for tc in target_currencies
    ]

    return GlobalRateSummary(user_base_currency=user_base, currencies=currencies)
```

- [ ] **Step 4: Register the router**

Add to `app/routers/__init__.py`:

```python
from .rate_history import router as rate_history_router
```

And add `"rate_history_router"` to `__all__`.

Add to `app/main.py` imports:

```python
rate_history_router,
```

Add to `app/main.py` router inclusion section:

```python
app.include_router(rate_history_router)
```

- [ ] **Step 5: Add `rate_snapshots` to conftest cleanup**

In `tests/conftest.py`, add `"rate_snapshots"` to the `tables_to_clean` list (around line 134):

```python
"rate_snapshots",
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
source .venv/bin/activate && pytest tests/test_rate_history_router.py -v
```
Expected: All 3 tests PASS

- [ ] **Step 7: Run full backend test suite**

```bash
source .venv/bin/activate && pytest -q --cov=app tests/
```
Expected: All tests pass, no regressions

- [ ] **Step 8: Run backend linter**

```bash
source .venv/bin/activate && flake8 app/routers/rate_history.py app/services/rate_snapshot_service.py app/schemas/rate_snapshot.py --max-line-length=100
```
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add app/routers/rate_history.py app/routers/__init__.py app/main.py tests/test_rate_history_router.py tests/conftest.py
git commit -m "feat: add rate history API endpoints for trip and global views"
```

---

## Scope 4: Frontend — Install Chart.js & Build Shared Components

**Goal:** Install chart dependencies, add TypeScript types, API methods, and build reusable `RateTable` and `RateChart` components.

### Task 4.1: Install dependencies and add types

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Install chart.js and react-chartjs-2**

```bash
cd frontend && npm install chart.js react-chartjs-2
```

- [ ] **Step 2: Add TypeScript types**

Add to `frontend/lib/types.ts`:

```typescript
// Exchange rate monitoring types

export interface RatePoint {
  rate: number;
  fetched_at: string;
}

export interface CurrencyRateSummary {
  base_currency: string;
  target_currency: string;
  current_rate: number | null;
  history: RatePoint[];
}

export interface TripRateSummary {
  trip_base_currency: string;
  currencies: CurrencyRateSummary[];
}

export interface GlobalRateSummary {
  user_base_currency: string;
  currencies: CurrencyRateSummary[];
}
```

- [ ] **Step 3: Add API methods**

Add to `frontend/lib/api.ts`, after the `exchangeApi` object:

```typescript
export const rateHistoryApi = {
  getTripSummary: (tripId: number, days = 30) =>
    api.get<TripRateSummary>(`/rate-history/trip/${tripId}?days=${days}`),
  getGlobalSummary: (days = 30) =>
    api.get<GlobalRateSummary>(`/rate-history/global?days=${days}`),
};
```

Import the new types at the top of the api.ts file:

```typescript
import { TripRateSummary, GlobalRateSummary } from './types';
```

- [ ] **Step 4: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat: add chart.js deps, rate history types and API client"
```

### Task 4.2: Build RateTable component

**Files:**
- Create: `frontend/components/exchange-rates/RateTable.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/components/exchange-rates/RateTable.tsx
'use client';

import { CurrencyRateSummary } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RateTableProps {
  baseCurrency: string;
  currencies: CurrencyRateSummary[];
}

export function RateTable({ baseCurrency, currencies }: RateTableProps) {
  if (currencies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No foreign currencies used yet. Add expenses in different currencies to see rates here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Currency</th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">
              Rate (1 {baseCurrency} =)
            </th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Trend</th>
            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data Points</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((c) => {
            const trend = getTrend(c);
            return (
              <tr key={c.target_currency} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-800">{c.target_currency}</td>
                <td className="py-3 px-4 font-mono text-slate-700">
                  {c.current_rate != null ? c.current_rate.toFixed(4) : '—'}
                </td>
                <td className="py-3 px-4">
                  <TrendIndicator trend={trend} />
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">{c.history.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Trend = 'up' | 'down' | 'flat' | 'unknown';

function getTrend(c: CurrencyRateSummary): Trend {
  if (c.history.length < 2 || c.current_rate == null) return 'unknown';
  const oldest = c.history[0].rate;
  const diff = c.current_rate - oldest;
  if (Math.abs(diff) < 0.0001) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function TrendIndicator({ trend }: { trend: Trend }) {
  switch (trend) {
    case 'up':
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingUp className="w-4 h-4" /> Up
        </span>
      );
    case 'down':
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <TrendingDown className="w-4 h-4" /> Down
        </span>
      );
    case 'flat':
      return (
        <span className="flex items-center gap-1 text-slate-500 text-sm">
          <Minus className="w-4 h-4" /> Flat
        </span>
      );
    default:
      return <span className="text-sm text-slate-400">—</span>;
  }
}
```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/exchange-rates/RateTable.tsx
git commit -m "feat: add RateTable component for exchange rate display"
```

### Task 4.3: Build RateChart component

**Files:**
- Create: `frontend/components/exchange-rates/RateChart.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/components/exchange-rates/RateChart.tsx
'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CurrencyRateSummary } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Distinct colors for up to 10 currency lines
const LINE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

interface RateChartProps {
  baseCurrency: string;
  currencies: CurrencyRateSummary[];
}

export function RateChart({ baseCurrency, currencies }: RateChartProps) {
  const chartData = useMemo(() => {
    // Only include currencies that have history
    const withHistory = currencies.filter((c) => c.history.length > 0);

    if (withHistory.length === 0) return null;

    // Collect all unique timestamps across all currencies, sorted
    const allTimestamps = [
      ...new Set(
        withHistory.flatMap((c) =>
          c.history.map((p) => p.fetched_at)
        )
      ),
    ].sort();

    // Format labels as short dates
    const labels = allTimestamps.map((t) =>
      new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    );

    const datasets = withHistory.map((c, i) => {
      // Map this currency's history into the shared timeline
      const rateMap = new Map(c.history.map((p) => [p.fetched_at, p.rate]));
      const data = allTimestamps.map((t) => rateMap.get(t) ?? null);

      return {
        label: c.target_currency,
        data,
        borderColor: LINE_COLORS[i % LINE_COLORS.length],
        backgroundColor: LINE_COLORS[i % LINE_COLORS.length] + '1a',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  }, [currencies]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-slate-500">
        No historical data yet. Rates will be recorded as you use the app.
      </div>
    );
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Exchange Rates (1 ${baseCurrency} = ?)`,
        font: { size: 14 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'Rate' },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}
```

- [ ] **Step 2: Create barrel exports**

Create `frontend/components/exchange-rates/index.ts`:

```typescript
export { RateTable } from './RateTable';
export { RateChart } from './RateChart';
```

- [ ] **Step 3: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/components/exchange-rates/
git commit -m "feat: add RateChart component with Chart.js line graph"
```

---

## Scope 5: Frontend — Trip-Scoped Exchange Rate Page

**Goal:** Create the trip-scoped page at `/trips/[id]/exchange-rates` and add a tab for it in the trip detail view.

### Task 5.1: Create the trip exchange rates page

**Files:**
- Create: `frontend/app/trips/[id]/exchange-rates/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// frontend/app/trips/[id]/exchange-rates/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { rateHistoryApi } from '@/lib/api';
import { TripRateSummary } from '@/lib/types';
import { RateTable } from '@/components/exchange-rates/RateTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

const RateChart = dynamic(
  () => import('@/components/exchange-rates/RateChart').then((m) => m.RateChart),
  { ssr: false }
);

function TripExchangeRatesContent() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [data, setData] = useState<TripRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await rateHistoryApi.getTripSummary(tripId, days);
        setData(response.data);
      } catch (err) {
        console.error('Error loading rate data:', err);
        setError('Failed to load exchange rate data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId, days]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push(`/trips/${tripId}`)}
            leftIcon={<ArrowLeft />}
          >
            Back to Trip
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Exchange Rates</h1>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 mb-6">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-500">Loading exchange rates...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500">{error}</div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">
                Rate Chart — Base: {data.trip_base_currency}
              </h2>
              <RateChart baseCurrency={data.trip_base_currency} currencies={data.currencies} />
            </Card>

            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Current Rates</h2>
              <RateTable baseCurrency={data.trip_base_currency} currencies={data.currencies} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TripExchangeRatesPage() {
  return (
    <ProtectedRoute>
      <TripExchangeRatesContent />
    </ProtectedRoute>
  );
}
```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/trips/\[id\]/exchange-rates/page.tsx
git commit -m "feat: add trip-scoped exchange rates page"
```

### Task 5.2: Add exchange rates tab to trip detail page

**Files:**
- Modify: `frontend/app/trips/[id]/page.tsx`

- [ ] **Step 1: Add the tab**

In `frontend/app/trips/[id]/page.tsx`:

1. Add `LineChart` to the lucide-react import (line 9):
   ```typescript
   import { MapPin, Receipt, Package, Compass, Clock, Users, Calendar, LineChart } from 'lucide-react';
   ```

2. Add `useRouter` is already imported. Add the exchange rates tab to the tabs array (after `packing` around line 178):
   ```typescript
   { id: 'packing', label: 'Packing List', icon: Package },
   ```
   Add after it:
   ```typescript
   { id: 'exchange-rates', label: 'Rates', icon: LineChart },
   ```

3. Update the `activeTab` type (line 36) to include the new tab:
   ```typescript
   'days' | 'destinations' | 'timeline' | 'expenses' | 'activities' | 'packing' | 'exchange-rates'
   ```

4. Handle the exchange-rates tab click to navigate to the dedicated page. Replace the tabs `.map()` `onClick` handler (around line 186) with:
   ```typescript
   onClick={() => {
     if (tab.id === 'exchange-rates') {
       router.push(`/trips/${tripId}/exchange-rates`);
     } else {
       setActiveTab(tab.id as typeof activeTab);
     }
   }}
   ```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/trips/\[id\]/page.tsx
git commit -m "feat: add exchange rates tab to trip detail page"
```

---

## Scope 6: Frontend — Global Exchange Rate Page & Nav Link

**Goal:** Create the global exchange rates page at `/exchange-rates` and add it to the main navigation.

### Task 6.1: Create the global exchange rates page

**Files:**
- Create: `frontend/app/exchange-rates/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// frontend/app/exchange-rates/page.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { rateHistoryApi } from '@/lib/api';
import { GlobalRateSummary } from '@/lib/types';
import { RateTable } from '@/components/exchange-rates/RateTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

const RateChart = dynamic(
  () => import('@/components/exchange-rates/RateChart').then((m) => m.RateChart),
  { ssr: false }
);

function GlobalExchangeRatesContent() {
  const [data, setData] = useState<GlobalRateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await rateHistoryApi.getGlobalSummary(days);
        setData(response.data);
      } catch (err) {
        console.error('Error loading rate data:', err);
        setError('Failed to load exchange rate data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [days]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Exchange Rates</h1>
        <p className="text-slate-500 mb-6">
          Rates for all currencies used across your trips, relative to your preferred currency.
        </p>

        {/* Time range selector */}
        <div className="flex gap-2 mb-6">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-500">Loading exchange rates...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-500">{error}</div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">
                Rate Chart — Base: {data.user_base_currency}
              </h2>
              <RateChart baseCurrency={data.user_base_currency} currencies={data.currencies} />
            </Card>

            <Card padding="lg">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Current Rates</h2>
              <RateTable baseCurrency={data.user_base_currency} currencies={data.currencies} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalExchangeRatesPage() {
  return (
    <ProtectedRoute>
      <GlobalExchangeRatesContent />
    </ProtectedRoute>
  );
}
```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/app/exchange-rates/page.tsx
git commit -m "feat: add global exchange rates page"
```

### Task 6.2: Add nav link

**Files:**
- Modify: `frontend/components/Navigation.tsx`

- [ ] **Step 1: Add the exchange rates link to navigation**

In `frontend/components/Navigation.tsx`:

1. Add a nav link after the "Settings" link (after line 41):
   ```typescript
   <Link
     href="/exchange-rates"
     className="text-white hover:text-primary-200 transition-colors font-medium"
   >
     Rates
   </Link>
   ```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Navigation.tsx
git commit -m "feat: add exchange rates link to main navigation"
```

### Task 6.3: Manual verification

- [ ] **Step 1: Start backend**

```bash
source .venv/bin/activate && uvicorn app.main:app --reload
```

- [ ] **Step 2: Start frontend (separate terminal)**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verify pages load**

1. Log in to the app at `http://localhost:3000`
2. Check "Rates" link appears in navigation
3. Click "Rates" — global page should load (may show empty state if no expenses yet)
4. Go to a trip → click "Rates" tab → trip exchange rates page should load
5. Verify the API responds at `http://localhost:8000/rate-history/global` (with auth header)

- [ ] **Step 4: Final lint check (both frontend and backend)**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

```bash
source .venv/bin/activate && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
```

Expected: No errors
