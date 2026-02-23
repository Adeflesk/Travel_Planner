# Design: Trip Wizard + Architecture Refactor

**Date:** 2026-02-22
**Status:** Design approved, not yet implemented
**Related docs:** `docs/plans/segment-builder-architecture.md`, `docs/plans/expense-architecture-review.md`

---

## Problem

Three compounding issues have been identified as the segment wizard and road trip builder have grown:

1. **Index-based form callbacks** — `LegForm` and `StopForm` receive `onUpdateField(index, field, value)`, requiring forms to know their own position in the segment array. Fragile when segments are reordered.
2. **Untyped metadata bag** — all per-segment data (mode, distance, cost, transport cards, stop activities) lives in `metadata: Record<string, unknown>`. No type safety, no autocomplete, no validation.
3. **Ad hoc propagation** — `propagateTime` and `propagateMeta` are implemented directly inside `RoadTripBuilder`. Any future builder (AirTravelBuilder, RailBuilder) would need to reinvent them.
4. **No trip-level context** — the trip creation form captures only name, dates, and budget. No questions about trip type, transport, travellers, or accommodation. Downstream builders have no context to personalise defaults or smart behaviour.
5. **Expense mega-link anti-pattern** — the `Expense` model carries nullable FKs for every entity type (`segment_id`, `activity_id`, `stop_option_id`, etc.). Each new feature requires a new migration and the table accumulates sparse rows.

---

## Solution: Approach B

- **`trip.context` JSONB column** — stores trip wizard answers; feeds downstream builders and expense UI
- **`TripContextProvider`** — React context wrapping the trip page; eliminates prop drilling of timezone, destinations, preferences
- **Typed segment metadata** — `LegMetadata` and `StopMetadata` interfaces replace `Record<string, unknown>`
- **Segment-scoped callbacks** — forms receive `onChange(partial: Partial<JourneySegmentDraft>)`, removing index coupling
- **Propagation helpers in `useSegmentBuilder`** — `propagateTimeForward` and `propagateMetaForward` become reusable, not per-builder
- **Expense link tables** — replace nullable FK columns with `segment_expenses`, `activity_expenses`, `stop_expenses` join tables

---

## Section 0: Libraries

Three libraries are adopted as part of this refactor. Two require installation; one is already present but unused.

### Install

```bash
cd frontend && npm install zod react-hook-form @hookform/resolvers
```

### `date-fns` + `date-fns-tz` — already installed

Already in `package.json`. Replace all raw `Date` arithmetic throughout `datetime-utils.ts` and `useSegmentBuilder` with `date-fns` functions. Also available for timezone-aware display via `date-fns-tz`.

```ts
// frontend/lib/datetime-utils.ts
import { addHours, parseISO, formatISO } from 'date-fns';

export const DEFAULT_SEGMENT_DURATION_HOURS = 2;
export const addHoursToISO = (iso: string, hours: number): string =>
  formatISO(addHours(parseISO(iso), hours));
export const defaultEndTime = (startIso: string, hours = DEFAULT_SEGMENT_DURATION_HOURS): string =>
  addHoursToISO(startIso, hours);
```

### `zod` — new

Used in two places:

1. **Parse `trip.context`** from the API response at the `TripContextProvider` boundary. `safeParse` handles null/partial context from trips created before the wizard — all fields are `.optional()` with defaults.
2. **Parse `segment.metadata`** as `LegMetadata` or `StopMetadata` at the form boundary — replaces the unsafe `as LegMetadata` cast.

```ts
// frontend/lib/trip-context.tsx
export const TripContextSchema = z.object({
  home_base: z.string().optional(),
  traveller_count: z.number().default(1),
  split_costs: z.boolean().default(false),
  trip_type: z.enum(['single_city','multi_city','road_trip','international']).default('single_city'),
  vehicle: z.enum(['own_car','rental','none']).default('none'),
  flight_type: z.enum(['none','return','multi_leg','comparing']).default('none'),
  accommodation: z.enum(['hotel','rental_property','camping','mix','unknown']).default('unknown'),
  pacing: z.enum(['relaxed','balanced','packed']).default('balanced'),
  budget_currency: z.string().default('USD'),
}).partial();

export type TripContext = z.infer<typeof TripContextSchema>;

// In TripContextProvider:
const parsed = TripContextSchema.safeParse(trip.context);
const context = parsed.success ? parsed.data : null;
```

### `react-hook-form` + `@hookform/resolvers` — new

Used in `TripWizard` and `TripSettings`. Replaces the `useState<WizardData>` approach.

- **Zod resolver** — `TripContextSchema` doubles as form validation rules; one source of truth
- **`reset(defaultValues)`** — `TripSettings` calls `reset(trip.context)` on open and on cancel, giving clean rollback with one line
- **Performance** — uncontrolled inputs avoid re-rendering the whole wizard on every keystroke

```ts
// TripWizard.tsx
const { register, handleSubmit, watch, formState: { errors } } = useForm<TripContext>({
  resolver: zodResolver(TripContextSchema),
  defaultValues: { traveller_count: 1, pacing: 'balanced', budget_currency: 'USD' },
});
```

---

## Section 1: Trip Wizard Questions Flow

Replaces the current minimal name/dates modal with a 5-step wizard.

```
Step 1 — Basics
  Trip name
  Home base / departure city (free text)
  Start date · End date

Step 2 — Who's going
  Traveller count (stepper: 1–20, default 1)
  Split costs? (yes/no — hidden if traveller_count = 1)

Step 3 — Trip type + transport
  Trip type:
    ○ Single city / weekend
    ○ Multi-city tour
    ○ Road / rail trip          → seeds RoadTripBuilder as default for journeys
    ○ International             → enables timezone prominence, foreign currency defaults

  Car:
    ○ Own car
    ○ Rental car               → pre-selects "Rental" mode in all LEG forms
    ○ Neither / undecided

  Flights:
    ○ No flights
    ○ Return (no layovers)     → auto-creates outbound + return Journey pair on first journey creation
    ○ Multi-leg                → journey builder opens in standard FLIGHT template mode
    ○ Comparing options        → [future: comparison mode, not in initial implementation]

Step 4 — Stay + pace
  Accommodation:
    ○ Hotel / motel
    ○ Rental property (Airbnb, etc.)
    ○ Camping
    ○ Mix / undecided

  Pacing:
    ○ Relaxed (few stops, long stays)   → default stop duration = 4 h
    ○ Balanced                          → default stop duration = 2 h (current default)
    ○ Packed (many stops, short stays)  → default stop duration = 1 h

Step 5 — Budget
  Total budget (number, optional)
  Currency (select, default = user locale)

→ Review & Create
```

All fields except trip name and dates are optional — the wizard can be skipped through with defaults if the user prefers.

---

## Section 2: TripContext Data Model

Stored as a `context` JSON column (nullable) on the `trips` table. Existing trips get `null`; all downstream logic treats `null` context as "no preferences set" and falls back to current defaults — no regressions.

```ts
// frontend/lib/trip-context.ts

export interface TripContext {
  // Step 1
  home_base?: string;                    // departure city, free text

  // Step 2
  traveller_count: number;               // 1 = solo
  split_costs: boolean;                  // false when traveller_count = 1

  // Step 3
  trip_type: 'single_city' | 'multi_city' | 'road_trip' | 'international';
  vehicle: 'own_car' | 'rental' | 'none';
  flight_type: 'none' | 'return' | 'multi_leg' | 'comparing';

  // Step 4
  accommodation: 'hotel' | 'rental_property' | 'camping' | 'mix' | 'unknown';
  pacing: 'relaxed' | 'balanced' | 'packed';

  // Step 5 — budget amount stays on Trip.budget; currency lives here
  budget_currency: string;               // 'AUD', 'USD', 'EUR', etc.
}
```

**Effects on downstream builders:**

| Field | Effect |
|---|---|
| `vehicle: 'rental'` | LEG forms pre-select "Rental car" mode; transport cards rank rental first |
| `flight_type: 'return'` | First journey creation auto-creates two Journey records (outbound + return) |
| `trip_type: 'international'` | Timezone fields more prominent; currency defaults to destination |
| `pacing: 'relaxed'` | `defaultEndTime` seeds 4 h instead of 2 h for STOP segments |
| `pacing: 'packed'` | `defaultEndTime` seeds 1 h for STOP segments |
| `split_costs: true` | Expense entry shows per-person split field |
| `traveller_count` | Used in per-person cost calculations in expense views |
| `budget_currency` | Default currency pre-filled on all new Expense records |

---

## Section 3: Architecture

### 3a. TripContextProvider

Wraps the trip detail page. All builders and forms read from it via `useTripContext()`.

```
app/trips/[id]/page.tsx
  └── <TripContextProvider trip={trip}>
        ├── TripHeader          → shows trip type badge, settings button
        ├── JourneyForm
        │     └── SegmentWizard
        │           └── RoadTripBuilder
        │                 └── LegForm   → useTripContext() for vehicle default
        │                 └── StopForm  → useTripContext() for pacing default
        └── ExpenseList         → useTripContext() for currency + split

// frontend/lib/trip-context.tsx
export const useTripContext = (): TripContext | null
```

`destinations`, `defaultTimezone`, `startDate` remain as props where they are local to the journey — TripContext handles trip-wide preferences, not per-journey data.

### 3b. Typed Segment Metadata

```ts
// frontend/lib/segment-metadata.ts

export interface LegMetadata {
  mode?: 'drive' | 'rental' | 'hire' | 'train' | 'bus' | 'ferry' | 'other';
  distance?: number;
  routeNotes?: string;
  cost?: number;
  currency?: string;
  booked?: boolean;
  paid?: boolean;
  provider?: string;
  selected_segment_option?: number;
  draft_segment_options?: DraftSegmentOption[];
}

export interface StopMetadata {
  passThrough?: boolean;
  draft_stop_options?: DraftStopOption[];
}
```

`JourneySegmentDraft.metadata` stays `Record<string, unknown>` at the transport layer (DB round-trip). Each form casts to its typed interface on read, and writes back a typed object. The cast is a single line per form — no structural change to the API.

### 3c. Segment-Scoped Callbacks

Forms no longer need to know their index.

**Before (fragile):**
```ts
// LegForm props
onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void
onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, tz?: string) => void
```

**After (decoupled):**
```ts
// LegForm props
onChange: (partial: Partial<JourneySegmentDraft>) => void
onUpdateLocation: (side: 'origin' | 'destination', name: string, tz?: string) => void
```

The builder wraps these once:
```ts
// In RoadTripBuilder, when rendering LegForm:
<LegForm
  segment={selectedSeg}
  onChange={(partial) => updateSegmentAt(safeIdx, partial)}
  onUpdateLocation={(side, name, tz) => handleUpdateLocation(safeIdx, side, name, tz)}
/>
```

`updateSegmentAt(index, partial)` is added to `useSegmentBuilder` — reused by all builders.

### 3d. Propagation Helpers Move to `useSegmentBuilder`

```ts
// useSegmentBuilder now returns:
propagateTimeForward: (targetIdx: number, force: boolean) => void
propagateMetaForward: (targetIdx: number) => void
```

`RoadTripBuilder` calls these instead of maintaining its own copies. Any future builder gets them for free.

---

## Section 4: Expense Architecture

### 4a. Link Tables Replace Nullable FKs

**Before (mega-link anti-pattern):**
```
expenses: id · trip_id · amount · category · segment_id? · activity_id? · stop_option_id? · ...
```

**After:**
```
expenses: id · trip_id · amount · currency · category · description · date · paid

segment_expenses:  segment_id  · expense_id
activity_expenses: activity_id · expense_id
stop_expenses:     stop_id     · expense_id
# future — no expenses table migration needed:
accommodation_expenses: accommodation_id · expense_id
```

Supports multiple expenses per item (fuel + tolls on a LEG, deposit + final on accommodation). DB-level foreign key integrity on both sides.

### 4b. Two Cost Entry Points

| | Metadata `cost` | Expense record |
|---|---|---|
| Purpose | Quick planning estimate | Actual tracked spend |
| When created | During segment form editing | From Expenses section, or promoted from metadata |
| DB | `segment.metadata` JSON | `expenses` + link table |
| Counts toward trip budget | No | Yes |

### 4c. Cost Promotion Flow

When a Journey is saved (on the Review step, not during editing), if any segment has `metadata.cost` set and no linked expense record exists, the app shows a non-blocking banner:

> **"3 segment costs recorded — log them as expenses?"**  [Log all] [Dismiss]

"Log all" creates one Expense record per segment with a cost, linked via `segment_expenses`, using `budget_currency` as the currency default. The user can review/edit them in the Expenses section. This fires once per save; dismissing it suppresses it for that journey.

---

## Section 5: Policies

### 5a. TripContext Editability

The trip wizard runs once at creation. A **"Trip settings"** panel is accessible from the trip header (gear icon or "Settings" link) at any time post-creation. It re-renders the same 5-step wizard content as an editable form, saving via `PATCH /trips/{id}`.

### 5b. TripContext Changes Don't Retroactively Update Existing Segments

If the user edits TripContext (e.g., changes `vehicle` from "own_car" to "rental"), **no existing segments are modified**. The new context applies only to segments created after the change. Users manage existing segments manually. This avoids unexpected overwriting of deliberate user choices.

### 5c. Multi-Currency

`TripContext.budget_currency` sets the denomination for the trip budget total and the default currency on new Expense records. Individual expense records store their own `currency` field (already the case). The budget summary aggregates all expenses — expenses in a different currency display with a flag icon and are excluded from the total with a note: *"2 expenses in foreign currencies excluded — FX conversion not supported."* Full FX conversion is out of scope.

### 5d. Return Flight Auto-Creation

When `flight_type: 'return'` and the user creates their first journey, the app creates **two separate Journey records**:

- **Outbound:** template = `AIR_TRAVEL` (TRANSFER → FLIGHT → TRANSFER), origin = home_base, destination = first trip destination
- **Return:** template = `AIR_TRAVEL`, origin = first trip destination, destination = home_base, dates = trip end date

Each is a separate Journey because they represent distinct logical travel days. The user edits them independently in the journey list.

---

## Section 6: File Inventory

### New Files

| File | Purpose |
|---|---|
| `app/migrations/add_trip_context.py` | Adds `context JSON` column to `trips` table |
| `app/migrations/add_expense_link_tables.py` | Creates `segment_expenses`, `activity_expenses`, `stop_expenses` |
| `frontend/lib/trip-context.tsx` | `TripContext` interface, `TripContextProvider`, `useTripContext` hook |
| `frontend/lib/segment-metadata.ts` | `LegMetadata`, `StopMetadata` typed interfaces |
| `frontend/components/trips/TripWizard.tsx` | 5-step trip creation wizard |
| `frontend/components/trips/TripSettings.tsx` | Editable TripContext panel (re-uses wizard step components) |

### Modified Files

| File | Change |
|---|---|
| `app/models/trip.py` | Add `context` JSON column |
| `app/schemas/trip.py` | Add `context: TripContextSchema \| None` to `TripBase` |
| `app/models/expense.py` | Remove nullable entity FKs; add link table models |
| `app/routers/expenses.py` | Update create/read to use link tables |
| `frontend/lib/types.ts` | Add `context` field to `Trip` interface; add `TripContext` re-export |
| `frontend/components/journey-segments/useSegmentBuilder.ts` | Add `updateSegmentAt`, `propagateTimeForward`, `propagateMetaForward` |
| `frontend/components/journey-segments/LegForm.tsx` | Use `LegMetadata` type; switch to `onChange(partial)` callback |
| `frontend/components/journey-segments/StopForm.tsx` | Use `StopMetadata` type; switch to `onChange(partial)` callback |
| `frontend/components/journey-segments/RoadTripBuilder.tsx` | Remove ad hoc propagation; call `propagateTimeForward`/`propagateMetaForward` from hook; use `useTripContext()` for vehicle default and stop pacing |
| `frontend/components/journey-segments/SegmentWizard.tsx` | Use `useTripContext()` for flight type auto-creation |
| `frontend/app/trips/[id]/page.tsx` | Wrap in `TripContextProvider` |
| `frontend/components/trips/TripForm.tsx` | Replace with `TripWizard` |

### Unchanged

Backend journey/segment routers, `RoadTripTimeline.tsx`, `TransportOptionCards.tsx`, `StopActivitiesList.tsx`, `SegmentLocationInputs.tsx`, `SegmentTimingEditor.tsx`, E2E tests (interface changes are additive).

---

## Section 7: Exchange Rate Service

### 7a. Overview

The multi-currency policy (Section 5c) currently excludes foreign-currency expenses from the budget total with a note. This section resolves that by fetching daily exchange rates and storing them in the DB, enabling accurate budget totals across currencies.

**API:** [ExchangeRate-API](https://www.exchangerate-api.com/) free tier — 165 currencies, updates daily, 1,500 requests/month. A single daily fetch costs 30 requests/month, leaving headroom for manual refreshes.

**Scheduler:** APScheduler inside FastAPI (`AsyncIOScheduler`). Zero extra infrastructure — runs in the same process, same Fly.io deployment, same log stream. Multi-worker race conditions are benign at this scale (2 workers = 60 requests/month, still well within the free limit).

### 7b. Database schema

New table — one row per currency pair, base always USD:

```sql
CREATE TABLE exchange_rates (
    id          INTEGER PRIMARY KEY,
    base        TEXT NOT NULL DEFAULT 'USD',
    target      TEXT NOT NULL,             -- e.g. 'GBP', 'EUR', 'AUD'
    rate        NUMERIC(18, 8) NOT NULL,   -- 1 USD = rate TARGET
    fetched_at  TIMESTAMP NOT NULL,
    UNIQUE (base, target)
);
```

SQLAlchemy model:

```python
# app/models/exchange_rate.py
from sqlalchemy import Column, Integer, String, Numeric, DateTime, UniqueConstraint
from .base import Base

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id         = Column(Integer, primary_key=True)
    base       = Column(String(3), nullable=False, default="USD")
    target     = Column(String(3), nullable=False)
    rate       = Column(Numeric(18, 8), nullable=False)
    fetched_at = Column(DateTime, nullable=False)

    __table_args__ = (UniqueConstraint("base", "target"),)
```

### 7c. Scheduler setup

```python
# app/core/scheduler.py
import os
import logging
from datetime import datetime, timezone

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.dialects.postgresql import insert as pg_insert  # Postgres upsert
from sqlalchemy import text

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

EXCHANGE_API_KEY = os.environ.get("EXCHANGERATE_API_KEY", "")
EXCHANGE_API_URL = f"https://v6.exchangerate-api.com/v6/{EXCHANGE_API_KEY}/latest/USD"


@scheduler.scheduled_job("cron", hour=3, minute=0)  # 3:00 AM UTC daily
async def refresh_exchange_rates():
    """Fetch latest USD-based rates and upsert into exchange_rates table."""
    if not EXCHANGE_API_KEY:
        logger.warning("EXCHANGERATE_API_KEY not set — skipping rate refresh")
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(EXCHANGE_API_URL)
            r.raise_for_status()
            rates = r.json().get("conversion_rates", {})

        from database import SessionLocal  # import here to avoid circular deps
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            for target, rate in rates.items():
                db.execute(
                    text("""
                        INSERT INTO exchange_rates (base, target, rate, fetched_at)
                        VALUES ('USD', :target, :rate, :fetched_at)
                        ON CONFLICT (base, target)
                        DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at
                    """),
                    {"target": target, "rate": rate, "fetched_at": now},
                )
            db.commit()
        logger.info("Exchange rates refreshed: %d currencies", len(rates))
    except Exception as exc:
        logger.error("Exchange rate refresh failed: %s", exc)
```

Start the scheduler in `app/main.py` lifespan:

```python
# app/main.py
from contextlib import asynccontextmanager
from app.core.scheduler import scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

### 7d. Backend dependency

```bash
pip install apscheduler httpx
# add to requirements.txt:
apscheduler>=3.10
httpx>=0.27
```

`httpx` may already be present — check `requirements.txt` before adding.

### 7e. API endpoint — expose rates to frontend

```python
# app/routers/exchange_rates.py
@router.get("/exchange-rates")
async def get_exchange_rates(db: Session = Depends(get_db)):
    """Return all stored rates as { target: rate } dict, base = USD."""
    rows = db.query(ExchangeRate).all()
    return {
        "base": "USD",
        "fetched_at": rows[0].fetched_at.isoformat() if rows else None,
        "rates": {r.target: float(r.rate) for r in rows},
    }
```

### 7f. How rates are used in the frontend

A `useExchangeRates()` hook fetches rates once per session and caches them. The expense summary uses it to convert all expenses to `budget_currency`:

```ts
// frontend/lib/currency-utils.ts

/**
 * Convert an amount from one currency to another using stored USD-base rates.
 * All rates are relative to USD: rate = 1 USD → N target.
 *
 * To convert GBP → AUD:
 *   1. GBP → USD: amount / rates['GBP']
 *   2. USD → AUD: * rates['AUD']
 */
export const convertCurrency = (
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>  // { USD: 1, GBP: 0.79, AUD: 1.55, ... }
): number | null => {
  if (from === to) return amount;
  const fromRate = from === 'USD' ? 1 : rates[from];
  const toRate = to === 'USD' ? 1 : rates[to];
  if (!fromRate || !toRate) return null;  // unknown currency — exclude
  return (amount / fromRate) * toRate;
};
```

Budget summary replaces the "excluded" note with converted totals. If a currency has no stored rate, it remains excluded with a flag icon.

### 7g. Environment variable

Add to `docs/deployment.md` Environment Variables Reference:

| Variable | Required | Description |
|---|---|---|
| `EXCHANGERATE_API_KEY` | No | ExchangeRate-API key. If unset, FX conversion disabled and daily refresh skipped. |

Making it optional means local dev and CI work without any API key — rates simply won't refresh.

### 7h. New files for exchange rate feature

| File | Purpose |
|---|---|
| `migrations/add_exchange_rates.py` | Creates `exchange_rates` table |
| `app/models/exchange_rate.py` | SQLAlchemy model |
| `app/routers/exchange_rates.py` | `GET /exchange-rates` endpoint |
| `app/core/scheduler.py` | APScheduler setup + daily refresh job |
| `frontend/lib/currency-utils.ts` | `convertCurrency` helper + `useExchangeRates` hook |

---

## Verification

1. `npx tsc --noEmit` — zero TypeScript errors after metadata typing
2. `npm run lint` — no new warnings in changed files
3. `pytest tests/ -x -q` — all backend tests pass after migrations
4. Manual: create new trip via wizard → all 5 steps navigate, trip.context saved to DB
5. Manual: create road trip with `vehicle: rental` → LegForm opens with "Rental car" pre-selected
6. Manual: `pacing: relaxed` → stop end time auto-fills as start + 4 h
7. Manual: `flight_type: return` → first journey creation produces two Journey records
8. Manual: edit TripContext → existing LEG segments unchanged; new segments use updated context
9. Manual: save journey with metadata costs → banner appears; "Log all" creates Expense records
10. Manual: international trip with GBP expenses on USD budget trip → GBP expenses flagged as excluded from total
11. Manual: existing trip with `context: null` → no regressions in any builder or expense form
