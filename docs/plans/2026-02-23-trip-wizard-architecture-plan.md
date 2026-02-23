# Trip Wizard + Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 5-step trip creation wizard that captures trip-level context (transport, pacing, travellers, accommodation) and refactor the segment builder to use typed metadata, segment-scoped callbacks, and a shared TripContextProvider.

**Architecture:** Backend gains a `context` JSON column on `trips` and new expense link tables. Frontend gains a `TripContextProvider` + `useTripContext()` hook, typed `LegMetadata`/`StopMetadata` interfaces, and segment-scoped `onChange(partial)` callbacks that remove the index-coupling from all forms.

**Tech Stack:** Python 3.13 / FastAPI / SQLAlchemy / SQLite (local) + Postgres (prod); Next.js 14 App Router / TypeScript / Tailwind CSS / Lucide icons. Tests: `pytest` (backend), `npx tsc --noEmit` + `npx eslint` (frontend).

**Design doc:** `docs/plans/2026-02-22-trip-wizard-architecture-design.md`

---

## Phase 0 — Frontend: Install libraries

### Task 0: Install `zod`, `react-hook-form`, and `@hookform/resolvers`

**Files:**
- Modify: `frontend/package.json` (via npm install)

**Step 1: Install**

```bash
cd frontend && npm install zod react-hook-form @hookform/resolvers
```

**Step 2: Update `datetime-utils.ts` to use `date-fns`**

`date-fns` is already in `package.json` but unused in new code. Replace the raw `Date` arithmetic:

```ts
// frontend/lib/datetime-utils.ts
import { addHours, parseISO, formatISO } from 'date-fns';

export const DEFAULT_SEGMENT_DURATION_HOURS = 2;

/** Add `hours` to an ISO 8601 string and return a new ISO 8601 string. */
export const addHoursToISO = (iso: string, hours: number): string =>
  formatISO(addHours(parseISO(iso), hours));

/**
 * Return a default end time: `startIso` + `durationHours` (default 2 h).
 *
 * Import pattern:
 *   import { defaultEndTime } from '@/lib/datetime-utils';
 *
 * Usage:
 *   const end = defaultEndTime(segment.start_datetime);       // start + 2 h
 *   const end = defaultEndTime(segment.start_datetime, 0.5);  // start + 30 min
 *   const end = defaultEndTime(segment.start_datetime, 4);    // relaxed pacing
 */
export const defaultEndTime = (
  startIso: string,
  durationHours: number = DEFAULT_SEGMENT_DURATION_HOURS
): string => addHoursToISO(startIso, durationHours);
```

**Step 3: Update `propagateTimeForward` in `useSegmentBuilder.ts` to use `addHoursToISO`**

```ts
import { addHoursToISO } from '@/lib/datetime-utils';

// In propagateTimeForward:
const end = addHoursToISO(start, 2);
```

**Step 4: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/datetime-utils.ts frontend/components/journey-segments/useSegmentBuilder.ts
git commit -m "feat: install zod + react-hook-form, update datetime-utils to use date-fns"
```

---

## Phase 1 — Backend: `trip.context` column

### Task 1: Migration — add `context` JSON column to `trips`

**Files:**
- Create: `migrations/add_trip_context.py`

**Step 1: Write the migration**

```python
"""
Database migration: Add context JSON column to trips table

Usage:
    python migrations/add_trip_context.py
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


def _column_exists(conn, table, column):
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "trips", "context"):
            conn.execute(text("ALTER TABLE trips ADD COLUMN context TEXT"))
            print("+ Added context to trips")
        else:
            print("= context already exists on trips")
        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print("SQLite: DROP COLUMN not supported. For Postgres:\n"
          "  ALTER TABLE trips DROP COLUMN context;")


if __name__ == "__main__":
    upgrade()
```

**Step 2: Run migration**

```bash
source .venv/bin/activate
python migrations/add_trip_context.py
```

Expected: `+ Added context to trips` then `Migration completed successfully!`

**Step 3: Verify column exists**

```bash
python -c "
from database import engine
from sqlalchemy import text, inspect
with engine.connect() as c:
    r = c.execute(text('PRAGMA table_info(trips)'))
    cols = [row[1] for row in r]
    assert 'context' in cols, 'context column missing'
    print('OK:', cols)
"
```

Expected: prints column list including `context`.

**Step 4: Commit**

```bash
git add migrations/add_trip_context.py
git commit -m "feat: add context JSON column to trips table"
```

---

### Task 2: Update Trip model, schema and API

**Files:**
- Modify: `app/models/trip.py`
- Modify: `app/schemas/trip.py`
- Test: `tests/test_trips.py` (add one new test)

**Step 1: Add `context` column to the Trip SQLAlchemy model**

In `app/models/trip.py`, add `JSON` to the imports and add the column after `status`:

```python
from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey, JSON,
)
# ...inside class Trip:
    context = Column(JSON, nullable=True)
```

**Step 2: Add `context` to Pydantic schemas**

In `app/schemas/trip.py`, add to `TripBase`:

```python
from typing import Any, Literal, Optional
# ...inside TripBase:
    context: Optional[dict[str, Any]] = None
```

Add to `TripUpdate` as well (so PATCH can update it):

```python
# ...inside TripUpdate:
    context: Optional[dict[str, Any]] = None
```

**Step 3: Write a failing test**

In `tests/test_trips.py`, add:

```python
def test_trip_context_roundtrip(client, auth_headers):
    """Trip.context is stored and returned correctly."""
    ctx = {"trip_type": "road_trip", "vehicle": "rental", "traveller_count": 2}
    resp = client.post(
        "/trips/",
        json={
            "name": "Context Test",
            "start_date": "2026-06-01",
            "end_date": "2026-06-10",
            "context": ctx,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["context"]["trip_type"] == "road_trip"
    assert data["context"]["vehicle"] == "rental"
```

**Step 4: Run test to confirm it fails first**

```bash
source .venv/bin/activate
pytest tests/test_trips.py::test_trip_context_roundtrip -v
```

Expected: FAIL (context field not recognised yet).

**Step 5: Run again after schema changes**

```bash
pytest tests/test_trips.py::test_trip_context_roundtrip -v
```

Expected: PASS.

**Step 6: Run full test suite**

```bash
pytest -q --cov=app tests/
```

Expected: all passing, no regressions.

**Step 7: Commit**

```bash
git add app/models/trip.py app/schemas/trip.py tests/test_trips.py
git commit -m "feat: add context field to Trip model and schemas"
```

---

## Phase 2 — Backend: Expense link tables

### Task 3: Migration — add `segment_expenses` and `activity_expenses` link tables

**Files:**
- Create: `migrations/add_expense_link_tables.py`

**Step 1: Write the migration**

```python
"""
Database migration: Add expense link tables

Adds:
- segment_expenses (segment_id, expense_id)
- activity_expenses (activity_id, expense_id)

The old nullable FK columns on expenses are preserved for backwards compatibility.
New application code writes to the link tables; old data is untouched.

Usage:
    python migrations/add_expense_link_tables.py
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
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table},
    )
    return result.fetchone() is not None


def upgrade():
    engine = _get_engine()
    with engine.connect() as conn:
        if not _table_exists(conn, "segment_expenses"):
            conn.execute(text("""
                CREATE TABLE segment_expenses (
                    segment_id INTEGER NOT NULL REFERENCES journey_segments(id) ON DELETE CASCADE,
                    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    PRIMARY KEY (segment_id, expense_id)
                )
            """))
            print("+ Created segment_expenses")
        else:
            print("= segment_expenses already exists")

        if not _table_exists(conn, "activity_expenses"):
            conn.execute(text("""
                CREATE TABLE activity_expenses (
                    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
                    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
                    PRIMARY KEY (activity_id, expense_id)
                )
            """))
            print("+ Created activity_expenses")
        else:
            print("= activity_expenses already exists")

        conn.commit()
    print("Migration completed successfully!")


def downgrade():
    print("For Postgres:\n"
          "  DROP TABLE segment_expenses;\n"
          "  DROP TABLE activity_expenses;")


if __name__ == "__main__":
    upgrade()
```

**Step 2: Run the migration**

```bash
python migrations/add_expense_link_tables.py
```

Expected: `+ Created segment_expenses`, `+ Created activity_expenses`, `Migration completed successfully!`

**Step 3: Commit**

```bash
git add migrations/add_expense_link_tables.py
git commit -m "feat: add segment_expenses and activity_expenses link tables"
```

---

### Task 4: Update Expense model with link table relationships

**Files:**
- Modify: `app/models/expense.py`

**Step 1: Add SQLAlchemy `Table` for link tables and relationships**

Replace the contents of `app/models/expense.py` with:

```python
"""
app/models/expense.py - Expense SQLAlchemy model

Defines the Expense model. Expenses link to segments and activities via
dedicated join tables (segment_expenses, activity_expenses) for clean
many-to-many relationships. The legacy nullable FK columns are preserved
for backwards compatibility with existing data.
"""

from sqlalchemy import (
    Column, Integer, String, Date, Numeric, Boolean, ForeignKey, Table,
)
from sqlalchemy.orm import relationship

from .base import Base

# Link tables
segment_expenses = Table(
    "segment_expenses",
    Base.metadata,
    Column("segment_id", Integer, ForeignKey("journey_segments.id", ondelete="CASCADE"), primary_key=True),
    Column("expense_id", Integer, ForeignKey("expenses.id", ondelete="CASCADE"), primary_key=True),
)

activity_expenses = Table(
    "activity_expenses",
    Base.metadata,
    Column("activity_id", Integer, ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True),
    Column("expense_id", Integer, ForeignKey("expenses.id", ondelete="CASCADE"), primary_key=True),
)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    # Legacy nullable FK columns — preserved for existing data
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    segment_option_id = Column(Integer, ForeignKey("segment_options.id"), nullable=True)
    stop_option_id = Column(Integer, ForeignKey("stop_options.id"), nullable=True)
    segment_id = Column(Integer, ForeignKey("journey_segments.id"), nullable=True)

    category = Column(String(50), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(String(200))
    date = Column(Date, nullable=False)
    booked = Column(Boolean, default=False)
    paid = Column(Boolean, default=False)
    cancel_by_date = Column(Date, nullable=True)

    trip = relationship("Trip", back_populates="expenses")
    destination = relationship("Destination", back_populates="expenses")
    activity = relationship("Activity", back_populates="expenses")
    segment_option = relationship("SegmentOption", backref="expenses")
    stop_option = relationship("StopOption", backref="expenses")
    segment = relationship("JourneySegment", back_populates="expenses")

    # Link table relationships
    linked_segments = relationship(
        "JourneySegment",
        secondary=segment_expenses,
        backref="linked_expenses",
        overlaps="segment,expenses",
    )
    linked_activities = relationship(
        "Activity",
        secondary=activity_expenses,
        backref="linked_expenses",
        overlaps="activity,expenses",
    )
```

**Step 2: Run the test suite to confirm no regressions**

```bash
pytest -q --cov=app tests/
```

Expected: all passing.

**Step 3: Commit**

```bash
git add app/models/expense.py
git commit -m "feat: add link table relationships to Expense model"
```

---

## Phase 3 — Frontend: Type system

### Task 5: Create `TripContext` types, provider and hook

**Files:**
- Create: `frontend/lib/trip-context.tsx`
- Modify: `frontend/lib/types.ts`

**Step 1: Create `frontend/lib/trip-context.tsx`**

```tsx
'use client';
import { createContext, useContext } from 'react';

export interface TripContext {
  home_base?: string;
  traveller_count: number;
  split_costs: boolean;
  trip_type: 'single_city' | 'multi_city' | 'road_trip' | 'international';
  vehicle: 'own_car' | 'rental' | 'none';
  flight_type: 'none' | 'return' | 'multi_leg' | 'comparing';
  accommodation: 'hotel' | 'rental_property' | 'camping' | 'mix' | 'unknown';
  pacing: 'relaxed' | 'balanced' | 'packed';
  budget_currency: string;
}

const TripContextCtx = createContext<TripContext | null>(null);

export const TripContextProvider = ({
  context,
  children,
}: {
  context: TripContext | null;
  children: React.ReactNode;
}) => (
  <TripContextCtx.Provider value={context}>
    {children}
  </TripContextCtx.Provider>
);

/** Returns the trip-level context, or null for trips created before the wizard. */
export const useTripContext = (): TripContext | null =>
  useContext(TripContextCtx);

/**
 * Returns the default stop duration in hours based on trip pacing.
 *   relaxed → 4 h, balanced → 2 h (default), packed → 1 h
 */
export const stopDurationHours = (ctx: TripContext | null): number => {
  if (!ctx) return 2;
  return ctx.pacing === 'relaxed' ? 4 : ctx.pacing === 'packed' ? 1 : 2;
};
```

**Step 2: Add `context` to `Trip` in `frontend/lib/types.ts`**

Add `context` field to the `Trip` interface (after `updated_at`):

```ts
  context?: TripContext | null;  // trip wizard answers; null for pre-wizard trips
```

Also add the import at the top of `types.ts`:

```ts
import type { TripContext } from './trip-context';
```

**Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

**Step 4: Lint**

```bash
npx eslint lib/trip-context.tsx --max-warnings=0
```

Expected: no warnings.

**Step 5: Commit**

```bash
git add frontend/lib/trip-context.tsx frontend/lib/types.ts
git commit -m "feat: add TripContext type, provider and useTripContext hook"
```

---

### Task 6: Create typed segment metadata interfaces

**Files:**
- Create: `frontend/lib/segment-metadata.ts`

**Step 1: Create the file**

```ts
/**
 * Typed metadata interfaces for JourneySegmentDraft.
 *
 * `JourneySegmentDraft.metadata` is stored as `Record<string, unknown>` at the
 * transport layer (DB round-trip). Cast to these types inside each form component:
 *
 *   const meta = segment.metadata as LegMetadata ?? {};
 *
 * Write back using the same type:
 *
 *   onChange({ metadata: { ...meta, mode: 'rental' } as LegMetadata });
 */

import type { DraftSegmentOption, DraftStopOption } from './segment-templates';

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

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 3: Commit**

```bash
git add frontend/lib/segment-metadata.ts
git commit -m "feat: add typed LegMetadata and StopMetadata interfaces"
```

---

## Phase 4 — Segment builder refactor

### Task 7: Add `updateSegmentAt` and propagation helpers to `useSegmentBuilder`

**Files:**
- Modify: `frontend/components/journey-segments/useSegmentBuilder.ts`

**Step 1: Add the three new actions to `SegmentBuilderActions`**

In the `SegmentBuilderActions` interface, add:

```ts
  updateSegmentAt: (index: number, partial: Partial<JourneySegmentDraft>) => void;
  propagateTimeForward: (targetIdx: number, force: boolean) => void;
  propagateMetaForward: (targetIdx: number) => void;
```

**Step 2: Add the implementations (before the `return` statement)**

```ts
  const updateSegmentAt = useCallback(
    (index: number, partial: Partial<JourneySegmentDraft>) => {
      const next = [...segments];
      next[index] = { ...next[index], ...partial } as JourneySegmentDraft;
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const propagateTimeForward = useCallback(
    (targetIdx: number, force: boolean) => {
      if (targetIdx <= 0 || targetIdx >= segments.length) return;
      const prev = segments[targetIdx - 1];
      const target = segments[targetIdx];
      if (!prev.end_datetime) return;
      if (!force && target.start_datetime) return;
      const start = prev.end_datetime;
      const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString();
      const next = segments.map((seg, i) =>
        i === targetIdx ? { ...seg, start_datetime: start, end_datetime: end } : seg
      );
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );

  const propagateMetaForward = useCallback(
    (targetIdx: number) => {
      const target = segments[targetIdx];
      if (target?.segment_type !== 'LEG') return;
      const targetMeta = (target.metadata ?? {}) as Record<string, unknown>;
      if (targetMeta.mode) return;
      const sourceLeg = [...segments.slice(0, targetIdx)]
        .reverse()
        .find((s) => s.segment_type === 'LEG' && s.metadata?.mode);
      if (!sourceLeg) return;
      const sourceMeta = sourceLeg.metadata as Record<string, unknown>;
      const updates: Record<string, unknown> = { mode: sourceMeta.mode };
      const sourceSelectedIdx = sourceMeta.selected_segment_option as number | undefined;
      if (sourceSelectedIdx !== undefined && sourceSelectedIdx >= 0) {
        const sourceOpts = (sourceMeta.draft_segment_options ?? []) as Array<{ name: string; provider?: string }>;
        const sourceOpt = sourceOpts[sourceSelectedIdx];
        if (sourceOpt) {
          const targetOpts = (targetMeta.draft_segment_options ?? []) as Array<{ name: string; provider?: string }>;
          const matchIdx = targetOpts.findIndex((o) => o.name === sourceOpt.name);
          if (matchIdx >= 0) {
            updates.selected_segment_option = matchIdx;
            updates.provider = targetOpts[matchIdx].provider ?? targetOpts[matchIdx].name;
          }
        }
      }
      const next = segments.map((seg, i) =>
        i === targetIdx ? { ...seg, metadata: { ...targetMeta, ...updates } } : seg
      );
      setSegments(reindexSegments(next));
    },
    [segments, setSegments]
  );
```

**Step 3: Add to the return object**

```ts
  return {
    applyIntent, addSegment, removeSegment, addLayoverAfterFirstFlight,
    updateSegmentType, updateLocation, updateField,
    updateSegmentAt, propagateTimeForward, propagateMetaForward,  // new
  };
```

**Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 5: Lint**

```bash
npx eslint components/journey-segments/useSegmentBuilder.ts --max-warnings=0
```

**Step 6: Commit**

```bash
git add frontend/components/journey-segments/useSegmentBuilder.ts
git commit -m "feat: add updateSegmentAt and propagation helpers to useSegmentBuilder"
```

---

### Task 8: Update `SegmentTimingEditor` to segment-scoped callback

**Files:**
- Modify: `frontend/components/journey-segments/SegmentTimingEditor.tsx`

**Step 1: Replace the props interface and usage**

Replace the entire file contents:

```tsx
import { JourneySegmentDraft } from '@/lib/types';
import Input from '@/components/ui/Input';

const toDatetimeLocal = (value?: string): string => {
  if (!value) return '';
  return value.substring(0, 16);
};

const fromDatetimeLocal = (value: string): string | undefined => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

interface SegmentTimingEditorProps {
  segment: JourneySegmentDraft;
  onChange: (partial: Partial<JourneySegmentDraft>) => void;
}

export const SegmentTimingEditor = ({ segment, onChange }: SegmentTimingEditorProps) => (
  <>
    <Input
      label="Start time"
      type="datetime-local"
      value={toDatetimeLocal(segment.start_datetime)}
      onChange={(e) => onChange({ start_datetime: fromDatetimeLocal(e.target.value) })}
    />
    <Input
      label="End time"
      type="datetime-local"
      value={toDatetimeLocal(segment.end_datetime)}
      onChange={(e) => onChange({ end_datetime: fromDatetimeLocal(e.target.value) })}
    />
  </>
);
```

**Step 2: Type-check (will show errors in callers — fix them next)**

```bash
npx tsc --noEmit 2>&1 | grep SegmentTimingEditor
```

Note the callers that need updating: `LegForm.tsx`, `StopForm.tsx`.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/SegmentTimingEditor.tsx
git commit -m "refactor: SegmentTimingEditor uses segment-scoped onChange callback"
```

---

### Task 9: Refactor `LegForm` — typed metadata + segment-scoped callbacks

**Files:**
- Modify: `frontend/components/journey-segments/LegForm.tsx`

**Step 1: Replace `LegForm` with updated version**

```tsx
'use client';
import { JourneySegmentDraft } from '@/lib/types';
import type { LegMetadata } from '@/lib/segment-metadata';
import type { DraftSegmentOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentLocationInputs } from './SegmentLocationInputs';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { TransportOptionCards } from './TransportOptionCards';

const legModeOptions = [
  { value: 'drive', label: 'Drive (own car)' },
  { value: 'rental', label: 'Rental car' },
  { value: 'hire', label: 'Hired / chartered' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'other', label: 'Other' },
];

interface LegFormProps {
  segment: JourneySegmentDraft;
  onChange: (partial: Partial<JourneySegmentDraft>) => void;
  onUpdateLocation: (side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const LegForm = ({ segment, onChange, onUpdateLocation }: LegFormProps) => {
  const meta = (segment.metadata ?? {}) as LegMetadata;
  const updateMeta = (updates: Partial<LegMetadata>) =>
    onChange({ metadata: { ...meta, ...updates } });

  const transportOpts = (meta.draft_segment_options ?? []) as DraftSegmentOption[];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentLocationInputs
          segment={segment}
          onUpdateLocation={(_, side, name, tz) => onUpdateLocation(side, name, tz)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} onChange={onChange} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Mode</label>
          <select
            value={String(meta.mode ?? '')}
            onChange={(e) => updateMeta({ mode: (e.target.value || undefined) as LegMetadata['mode'] })}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            <option value="">Select mode</option>
            {legModeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <Input
          label="Distance (km)"
          type="number"
          min="0"
          placeholder="e.g., 250"
          value={String(meta.distance ?? '')}
          onChange={(e) => updateMeta({ distance: Number(e.target.value) || undefined })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">Route notes</label>
        <textarea
          value={String(meta.routeNotes ?? '')}
          onChange={(e) => updateMeta({ routeNotes: e.target.value || undefined })}
          placeholder="e.g., Take the coastal road, stop at the viewpoint"
          rows={2}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs resize-none"
        />
      </div>

      <TransportOptionCards
        opts={transportOpts}
        selectedIdx={transportOpts.length > 0 ? Number(meta.selected_segment_option ?? -1) : null}
        onChange={(next) => updateMeta({ draft_segment_options: next })}
        onSelect={(oi, opt) => updateMeta({ selected_segment_option: oi, provider: opt.provider ?? opt.name })}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cost</div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={String(meta.cost ?? '')}
            onChange={(e) => updateMeta({ cost: Number(e.target.value) || undefined })}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Currency</label>
            <select
              value={String(meta.currency ?? 'USD')}
              onChange={(e) => updateMeta({ currency: e.target.value })}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input type="checkbox" checked={Boolean(meta.booked)} onChange={(e) => updateMeta({ booked: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Booked
            </label>
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input type="checkbox" checked={Boolean(meta.paid)} onChange={(e) => updateMeta({ paid: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Paid
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
```

Note: `SegmentLocationInputs` still takes `index` internally — pass `0` or adapt its prop. Check `SegmentLocationInputs.tsx` and update the call if needed.

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

Fix any remaining errors in files that call `LegForm`.

**Step 3: Lint**

```bash
npx eslint components/journey-segments/LegForm.tsx --max-warnings=0
```

**Step 4: Commit**

```bash
git add frontend/components/journey-segments/LegForm.tsx
git commit -m "refactor: LegForm uses typed LegMetadata and segment-scoped onChange"
```

---

### Task 10: Refactor `StopForm` — typed metadata + segment-scoped callbacks

**Files:**
- Modify: `frontend/components/journey-segments/StopForm.tsx`

**Step 1: Replace `StopForm`**

```tsx
'use client';
import { JourneySegmentDraft } from '@/lib/types';
import type { StopMetadata } from '@/lib/segment-metadata';
import type { DraftStopOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { StopActivitiesList } from './StopActivitiesList';

interface StopFormProps {
  segment: JourneySegmentDraft;
  onChange: (partial: Partial<JourneySegmentDraft>) => void;
  onUpdateLocation: (side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const StopForm = ({ segment, onChange, onUpdateLocation }: StopFormProps) => {
  const meta = (segment.metadata ?? {}) as StopMetadata;
  const updateMeta = (updates: Partial<StopMetadata>) =>
    onChange({ metadata: { ...meta, ...updates } });

  const stopOpts = (meta.draft_stop_options ?? []) as DraftStopOption[];
  const locationName = segment.origin.name ?? '';

  const handleLocationChange = (name: string) => {
    onUpdateLocation('origin', name);
    onUpdateLocation('destination', name);
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Stop name"
        placeholder="e.g., Grand Canyon"
        value={locationName}
        onChange={(e) => handleLocationChange(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} onChange={onChange} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(meta.passThrough)}
          onChange={(e) => updateMeta({ passThrough: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Pass-through stop (no activities planned)
      </label>

      {!meta.passThrough && (
        <StopActivitiesList
          opts={stopOpts}
          onChange={(next) => updateMeta({ draft_stop_options: next })}
        />
      )}
    </div>
  );
};
```

**Step 2: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint components/journey-segments/StopForm.tsx --max-warnings=0
```

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/StopForm.tsx
git commit -m "refactor: StopForm uses typed StopMetadata and segment-scoped onChange"
```

---

### Task 11: Update `RoadTripBuilder` to use hook propagation + `useTripContext`

**Files:**
- Modify: `frontend/components/journey-segments/RoadTripBuilder.tsx`

**Step 1: Remove the inline `propagateTime` and `propagateMeta` functions**

Delete the `propagateTime`, `propagateMeta`, `navigateNext` and `navigateTo` function bodies that currently live in the component body.

**Step 2: Wire up `useSegmentBuilder` hook actions**

At the top of `RoadTripBuilder`, call `useSegmentBuilder` and destructure the new helpers:

```tsx
const { propagateTimeForward, propagateMetaForward, updateSegmentAt, updateLocation } =
  useSegmentBuilder(segments, onChange);
```

**Step 3: Update `navigateNext` and `navigateTo`**

```tsx
const navigateNext = () => {
  const nextIdx = safeIdx + 1;
  if (nextIdx >= segments.length) return;
  propagateTimeForward(nextIdx, true);
  propagateMetaForward(nextIdx);
  setSelectedIdx(nextIdx);
};

const navigateTo = (idx: number) => {
  propagateTimeForward(idx, false);
  setSelectedIdx(idx);
};
```

**Step 4: Use `useTripContext` for vehicle default and stop pacing**

```tsx
import { useTripContext, stopDurationHours } from '@/lib/trip-context';

const tripCtx = useTripContext();

// When rendering LegForm, pass the context-aware default mode:
// (LegForm reads meta.mode — context only seeds it during propagateMeta)

// When rendering StopForm, pass context-aware onChange that seeds stop duration:
const handleStopChange = (idx: number) => (partial: Partial<JourneySegmentDraft>) => {
  // If start_datetime just set and end_datetime not yet set, seed duration from pacing
  if (partial.start_datetime && !segments[idx].end_datetime && !partial.end_datetime) {
    const hrs = stopDurationHours(tripCtx);
    const end = new Date(new Date(partial.start_datetime).getTime() + hrs * 3600000).toISOString();
    partial = { ...partial, end_datetime: end };
  }
  updateSegmentAt(idx, partial);
};
```

**Step 5: Update `LegForm` and `StopForm` call sites in RoadTripBuilder**

```tsx
{selectedSeg.segment_type === 'LEG' && (
  <LegForm
    segment={selectedSeg}
    onChange={(partial) => updateSegmentAt(safeIdx, partial)}
    onUpdateLocation={(side, name, tz) => {
      const loc = { type: 'custom' as const, name };
      updateLocation(safeIdx, side, loc, tz);
    }}
  />
)}
{selectedSeg.segment_type === 'STOP' && (
  <StopForm
    segment={selectedSeg}
    onChange={handleStopChange(safeIdx)}
    onUpdateLocation={(side, name, tz) => {
      const loc = { type: 'custom' as const, name };
      updateLocation(safeIdx, side, loc, tz);
    }}
  />
)}
```

**Step 6: Remove the now-unused `DraftSegmentOption` import** (since `propagateMeta` moved to hook)

**Step 7: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint components/journey-segments/RoadTripBuilder.tsx --max-warnings=0
```

**Step 8: Commit**

```bash
git add frontend/components/journey-segments/RoadTripBuilder.tsx
git commit -m "refactor: RoadTripBuilder uses useSegmentBuilder propagation helpers and useTripContext"
```

---

### Task 12: Update `SegmentLocationInputs` for segment-scoped callback

**Files:**
- Modify: `frontend/components/journey-segments/SegmentLocationInputs.tsx`

Read the current file first to understand its props, then update `onUpdateLocation` to be `(side, name, tz) => void` (drop the `index` parameter) and update all callers in `SegmentWizard.tsx` to wrap with `(side, name, tz) => updateLocation(idx, side, loc, tz)`.

After changes:

```bash
npx tsc --noEmit && npx eslint components/journey-segments/SegmentLocationInputs.tsx --max-warnings=0
git add frontend/components/journey-segments/SegmentLocationInputs.tsx
git commit -m "refactor: SegmentLocationInputs uses segment-scoped location callback"
```

---

## Phase 5 — Trip Wizard

### Task 13: Create `TripWizard` component

**Files:**
- Create: `frontend/components/trips/TripWizard.tsx`

**Step 1: Create the 5-step wizard**

The wizard is a controlled component. Each step renders a form section. Navigation uses local `step` state (1–5).

```tsx
'use client';
import { useState } from 'react';
import type { TripContext } from '@/lib/trip-context';

interface WizardData {
  // Step 1
  name: string;
  home_base: string;
  start_date: string;
  end_date: string;
  // Step 2
  traveller_count: number;
  split_costs: boolean;
  // Step 3
  trip_type: TripContext['trip_type'];
  vehicle: TripContext['vehicle'];
  flight_type: TripContext['flight_type'];
  // Step 4
  accommodation: TripContext['accommodation'];
  pacing: TripContext['pacing'];
  // Step 5
  budget: string;
  budget_currency: string;
}

const defaults: WizardData = {
  name: '', home_base: '', start_date: '', end_date: '',
  traveller_count: 1, split_costs: false,
  trip_type: 'single_city', vehicle: 'none', flight_type: 'none',
  accommodation: 'unknown', pacing: 'balanced',
  budget: '', budget_currency: 'USD',
};

interface TripWizardProps {
  onSubmit: (data: { name: string; start_date: string; end_date: string; budget?: number; context: TripContext }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const TripWizard = ({ onSubmit, onCancel, loading }: TripWizardProps) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaults);
  const set = (updates: Partial<WizardData>) => setData((d) => ({ ...d, ...updates }));

  const canNext = (): boolean => {
    if (step === 1) return data.name.trim() !== '' && data.start_date !== '' && data.end_date !== '';
    return true;
  };

  const handleSubmit = () => {
    const context: TripContext = {
      home_base: data.home_base || undefined,
      traveller_count: data.traveller_count,
      split_costs: data.split_costs,
      trip_type: data.trip_type,
      vehicle: data.vehicle,
      flight_type: data.flight_type,
      accommodation: data.accommodation,
      pacing: data.pacing,
      budget_currency: data.budget_currency,
    };
    onSubmit({
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      budget: data.budget ? parseFloat(data.budget) : undefined,
      context,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {[1,2,3,4,5].map((s) => (
          <span key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            s === step ? 'bg-primary-600 text-white' : s < step ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
          }`}>{s}</span>
        ))}
        <span className="ml-2">{['Basics','Travellers','Transport','Stay','Budget'][step-1]}</span>
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Trip name *</label>
            <input value={data.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g., European Summer 2026" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Departing from</label>
            <input value={data.home_base} onChange={(e) => set({ home_base: e.target.value })} placeholder="e.g., Sydney, Australia" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Start date *</label>
              <input type="date" value={data.start_date} onChange={(e) => set({ start_date: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">End date *</label>
              <input type="date" value={data.end_date} onChange={(e) => set({ end_date: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Travellers */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Number of travellers</label>
            <input type="number" min={1} max={20} value={data.traveller_count} onChange={(e) => set({ traveller_count: parseInt(e.target.value) || 1, split_costs: parseInt(e.target.value) > 1 ? data.split_costs : false })} className="border border-slate-300 rounded-md px-3 py-2 text-sm w-24" />
          </div>
          {data.traveller_count > 1 && (
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={data.split_costs} onChange={(e) => set({ split_costs: e.target.checked })} className="rounded border-gray-300" />
              Split costs equally between travellers
            </label>
          )}
        </div>
      )}

      {/* Step 3: Trip type + transport */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Trip type</div>
            {(['single_city','multi_city','road_trip','international'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                <input type="radio" checked={data.trip_type === t} onChange={() => set({ trip_type: t })} />
                {{ single_city: 'Single city / weekend', multi_city: 'Multi-city tour', road_trip: 'Road / rail trip', international: 'International' }[t]}
              </label>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Car</div>
            {(['own_car','rental','none'] as const).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                <input type="radio" checked={data.vehicle === v} onChange={() => set({ vehicle: v })} />
                {{ own_car: 'Own car', rental: 'Rental car', none: 'Neither / undecided' }[v]}
              </label>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Flights</div>
            {(['none','return','multi_leg','comparing'] as const).map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                <input type="radio" checked={data.flight_type === f} onChange={() => set({ flight_type: f })} />
                {{ none: 'No flights', return: 'Return (no layovers)', multi_leg: 'Multi-leg', comparing: 'Comparing options & dates' }[f]}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Stay + pace */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Accommodation</div>
            {(['hotel','rental_property','camping','mix','unknown'] as const).map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                <input type="radio" checked={data.accommodation === a} onChange={() => set({ accommodation: a })} />
                {{ hotel: 'Hotel / motel', rental_property: 'Rental property (Airbnb, etc.)', camping: 'Camping', mix: 'Mix / undecided', unknown: 'Not sure yet' }[a]}
              </label>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Trip pacing</div>
            {(['relaxed','balanced','packed'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-1">
                <input type="radio" checked={data.pacing === p} onChange={() => set({ pacing: p })} />
                {{ relaxed: 'Relaxed — few stops, long stays', balanced: 'Balanced', packed: 'Packed — many stops, short stays' }[p]}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Budget */}
      {step === 5 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Total budget (optional)</label>
              <input type="number" min={0} step="0.01" value={data.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="e.g., 5000" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <select value={data.budget_currency} onChange={(e) => set({ budget_currency: e.target.value })} className="border border-slate-300 rounded-md px-3 py-2 text-sm">
                {['USD','EUR','GBP','CAD','AUD','JPY','CHF','NZD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button type="button" onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">
          {step === 1 ? 'Cancel' : '← Back'}
        </button>
        {step < 5 ? (
          <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext()} className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-40">
            Next →
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading} className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-40">
            {loading ? 'Creating…' : 'Create trip →'}
          </button>
        )}
      </div>
    </div>
  );
};
```

**Step 2: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint components/trips/TripWizard.tsx --max-warnings=0
```

**Step 3: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "feat: add 5-step TripWizard component"
```

---

### Task 14: Wire `TripWizard` into the trips page + create `TripSettings`

**Files:**
- Modify: `frontend/app/trips/page.tsx` (replace TripForm modal with TripWizard)
- Modify: `frontend/app/trips/[id]/page.tsx` (wrap in TripContextProvider)
- Create: `frontend/components/trips/TripSettings.tsx`

**Step 1: Read `frontend/app/trips/page.tsx` and `frontend/components/trips/TripForm.tsx`**

Understand how `TripForm` is called, what `onSubmit` receives, and how it calls the API. Then replace the `TripForm` reference with `TripWizard`, passing the same `onSubmit` but now also sending `context` in the payload.

The `onSubmit` handler should call `POST /trips/` with `{ name, start_date, end_date, budget, context }`.

**Step 2: Read `frontend/app/trips/[id]/page.tsx`**

Wrap the page return in `TripContextProvider`:

```tsx
import { TripContextProvider } from '@/lib/trip-context';

// in the return:
<TripContextProvider context={trip.context ?? null}>
  {/* existing page content */}
</TripContextProvider>
```

**Step 3: Create `TripSettings.tsx`**

A simple panel that re-renders the wizard step content (Steps 2–5) as an editable form, pre-populated from `trip.context`. On save, calls `PATCH /trips/{id}` with the updated `context`.

```tsx
'use client';
import { useState } from 'react';
import type { TripContext } from '@/lib/trip-context';
// Re-use the step UI from TripWizard or extract step sub-components.
// For initial implementation: a single-page form with all TripContext fields.

interface TripSettingsProps {
  tripId: number;
  context: TripContext | null;
  onSave: (context: TripContext) => void;
  onClose: () => void;
}

export const TripSettings = ({ tripId, context, onSave, onClose }: TripSettingsProps) => {
  // Initialize state from existing context or defaults
  // Render all fields from Steps 2-5 in one scrollable form
  // On save: PATCH /trips/{tripId} with { context: updatedContext }
};
```

**Step 4: Add a settings button to the trip header**

Find the trip detail page header and add a gear/settings button that opens a slide-over or modal rendering `TripSettings`.

**Step 5: Type-check full project**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add frontend/app/trips/page.tsx frontend/app/trips/[id]/page.tsx frontend/components/trips/TripSettings.tsx
git commit -m "feat: wire TripWizard into trips page and wrap trip detail in TripContextProvider"
```

---

## Phase 6 — Journey integration

### Task 15: Return-flight auto-creation from `TripContext`

**Files:**
- Modify: `frontend/components/journeys/JourneyForm.tsx` (or wherever journey creation is triggered)

**Step 1: Read the current journey creation flow**

Find where `POST /trips/{id}/journeys/` is called after the user confirms a new journey.

**Step 2: Add auto-creation logic**

After the first journey is submitted successfully, if `tripCtx?.flight_type === 'return'` and there are currently 0 journeys for this trip, prompt:

> **"Create return journey?"** — [Yes, create return] [Skip]

If confirmed, immediately create a second journey with the same template but with origin/destination swapped and dates set to `trip.end_date`.

```tsx
const tripCtx = useTripContext();

const handleJourneySaved = async (newJourney: Journey) => {
  if (tripCtx?.flight_type === 'return' && existingJourneys.length === 0) {
    setShowReturnPrompt(true);
  }
};
```

**Step 3: Type-check and lint**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/components/journeys/JourneyForm.tsx
git commit -m "feat: prompt to auto-create return journey when flight_type is return"
```

---

### Task 16: Cost → expense promotion banner on journey save

**Files:**
- Modify: `frontend/components/journey-segments/SegmentWizard.tsx` (or the journey save handler)

**Step 1: Detect segments with metadata cost set**

After the journey is saved (on the review step's save action), scan the saved segments for any where `metadata.cost` is truthy and no linked expense exists yet.

```ts
const segmentsWithCost = savedSegments.filter(
  (s) => (s.metadata as LegMetadata)?.cost
);
```

**Step 2: Show the non-blocking banner**

If `segmentsWithCost.length > 0`, render a banner below the success message:

```tsx
{segmentsWithCost.length > 0 && !costBannerDismissed && (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
    <span className="text-sm text-amber-800">
      {segmentsWithCost.length} segment cost{segmentsWithCost.length > 1 ? 's' : ''} recorded — log them as expenses?
    </span>
    <div className="flex gap-2">
      <button onClick={handleLogAllCosts} className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700">
        Log all
      </button>
      <button onClick={() => setCostBannerDismissed(true)} className="text-xs text-amber-600 hover:text-amber-800 px-2">
        Dismiss
      </button>
    </div>
  </div>
)}
```

**Step 3: Implement "Log all"**

```ts
const handleLogAllCosts = async () => {
  const tripCtx = useTripContext();  // call at top of component
  for (const seg of segmentsWithCost) {
    const meta = seg.metadata as LegMetadata;
    await api.post(`/trips/${tripId}/expenses/`, {
      category: 'transport',
      amount: meta.cost,
      currency: meta.currency ?? tripCtx?.budget_currency ?? 'USD',
      description: `${seg.origin?.name} → ${seg.destination?.name}`,
      date: seg.start_datetime?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    });
    // Link via segment_expenses — add endpoint or handle in backend
  }
  setCostBannerDismissed(true);
};
```

Note: the backend expense creation endpoint will need to accept an optional `segment_id` and write to `segment_expenses`. Verify the expense router handles this before implementing the frontend call.

**Step 4: Type-check and lint**

```bash
npx tsc --noEmit && npx eslint components/journey-segments/SegmentWizard.tsx --max-warnings=0
```

**Step 5: Commit**

```bash
git add frontend/components/journey-segments/SegmentWizard.tsx
git commit -m "feat: show cost-to-expense promotion banner after journey save"
```

---

## Final verification

```bash
# Backend
source .venv/bin/activate
pytest -q --cov=app tests/
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics

# Frontend
cd frontend
npx tsc --noEmit
npm run lint

# Manual smoke tests (both servers running)
# 1. Create new trip via 5-step wizard — verify trip.context saved
# 2. Road trip + rental → first LEG form has "Rental car" pre-selected
# 3. pacing: relaxed → STOP end time seeds start + 4 h
# 4. flight_type: return → prompt appears after first journey saved
# 5. Save journey with metadata cost → banner appears; "Log all" creates expenses
# 6. Edit trip settings → existing segments unchanged
# 7. Old trip (context: null) → no regressions in any form
```
