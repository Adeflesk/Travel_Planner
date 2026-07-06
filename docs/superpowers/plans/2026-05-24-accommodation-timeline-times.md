# Accommodation Timeline Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `check_in_time` and `check_out_time` to accommodations so check-in and check-out events render as timed blocks on the day timeline.

**Architecture:** Two nullable `VARCHAR(5)` ("HH:MM") columns are added to the `accommodations` table — the same storage pattern used by `TripTransport.departure_time`. On the check-in day the timeline renders a green `AccommodationBlock`; on the check-out day an amber one. "Staying" days keep the existing badge. The badge in `DayBuilder` already uses `useTripAccommodations`; we extend that hook's data to the timeline.

**Tech Stack:** Python 3.13, SQLAlchemy, FastAPI, Pydantic v2, Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons.

---

## Files

| Action | Path |
|--------|------|
| Create | `migrations/add_accommodation_times.py` |
| Modify | `app/models/accommodation.py` |
| Modify | `app/schemas/accommodation.py` |
| Modify | `frontend/lib/types.ts` |
| Modify | `frontend/components/accommodations/AccommodationForm.tsx` |
| Create | `frontend/components/accommodations/AccommodationBlock.tsx` |
| Modify | `frontend/components/accommodations/index.ts` |
| Modify | `frontend/components/days/DayTimeline.tsx` |
| Modify | `frontend/components/days/DayBuilder.tsx` |

---

## Task 1: Database migration

**Files:**
- Create: `migrations/add_accommodation_times.py`

- [ ] **Step 1: Create the migration script**

```python
"""
Database migration: Add check_in_time and check_out_time to accommodations

Stores times as VARCHAR(5) "HH:MM" — same pattern as trip_transports.departure_time.

Usage:
    python migrations/add_accommodation_times.py
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


def _column_exists(conn, table: str, column: str) -> bool:
    if conn.engine.dialect.name == "postgresql":
        result = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ),
            {"t": table, "c": column},
        )
        return result.fetchone() is not None
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    return column in [row[1] for row in result]


def upgrade() -> None:
    engine = _get_engine()
    with engine.connect() as conn:
        if not _column_exists(conn, "accommodations", "check_in_time"):
            conn.execute(
                text("ALTER TABLE accommodations ADD COLUMN check_in_time VARCHAR(5)")
            )
            conn.commit()
            print("+ Added check_in_time to accommodations")
        else:
            print("= check_in_time already exists — skipping")

        if not _column_exists(conn, "accommodations", "check_out_time"):
            conn.execute(
                text("ALTER TABLE accommodations ADD COLUMN check_out_time VARCHAR(5)")
            )
            conn.commit()
            print("+ Added check_out_time to accommodations")
        else:
            print("= check_out_time already exists — skipping")

    print("Migration completed successfully!")


def downgrade() -> None:
    print(
        "SQLite: DROP COLUMN not supported — recreate accommodations without time columns.\n"
        "PostgreSQL: ALTER TABLE accommodations DROP COLUMN check_in_time; "
        "ALTER TABLE accommodations DROP COLUMN check_out_time;"
    )


if __name__ == "__main__":
    upgrade()
```

- [ ] **Step 2: Run the migration locally**

```bash
source .venv/bin/activate
python migrations/add_accommodation_times.py
```

Expected output:
```
+ Added check_in_time to accommodations
+ Added check_out_time to accommodations
Migration completed successfully!
```

- [ ] **Step 3: Verify columns exist**

```bash
source .venv/bin/activate
python -c "
from database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('PRAGMA table_info(accommodations)'))
    cols = [row[1] for row in result]
    print(cols)
    assert 'check_in_time' in cols
    assert 'check_out_time' in cols
    print('OK')
"
```

Expected: prints column list including `check_in_time` and `check_out_time`, then `OK`.

- [ ] **Step 4: Commit**

```bash
git add migrations/add_accommodation_times.py
git commit -m "feat: migration — add check_in_time/check_out_time to accommodations"
```

---

## Task 2: Backend model and schema

**Files:**
- Modify: `app/models/accommodation.py`
- Modify: `app/schemas/accommodation.py`

- [ ] **Step 1: Add columns to the SQLAlchemy model**

In `app/models/accommodation.py`, add two lines after `check_out_date`:

```python
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    check_in_time = Column(String(5), nullable=True)   # "HH:MM"
    check_out_time = Column(String(5), nullable=True)  # "HH:MM"
    cost = Column(Float, nullable=True)
```

Full import line at top needs `String` — it's already imported:
```python
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, Date, ForeignKey
```

- [ ] **Step 2: Add fields to Pydantic schemas**

In `app/schemas/accommodation.py`, add `check_in_time` and `check_out_time` to `AccommodationBase` and `AccommodationUpdate`:

```python
from pydantic import BaseModel
from datetime import date as DateType
from typing import Optional


class AccommodationBase(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    check_in_date: Optional[DateType] = None
    check_out_date: Optional[DateType] = None
    check_in_time: Optional[str] = None   # "HH:MM"
    check_out_time: Optional[str] = None  # "HH:MM"
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


class AccommodationCreate(AccommodationBase):
    destination_id: int
    trip_id: int
    name: str
    check_in_date: DateType
    check_out_date: DateType
    booked: bool = False
    paid: bool = False


class AccommodationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    check_in_date: Optional[DateType] = None
    check_out_date: Optional[DateType] = None
    check_in_time: Optional[str] = None   # "HH:MM"
    check_out_time: Optional[str] = None  # "HH:MM"
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
    name: str
    check_in_date: DateType
    check_out_date: DateType
    booked: bool
    paid: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Restart the backend and verify no errors**

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Expected: server starts without errors. Visit `http://localhost:8000/docs` — the accommodation schema should show `check_in_time` and `check_out_time` fields.

Stop the server (`Ctrl+C`).

- [ ] **Step 4: Run backend tests and lint**

```bash
source .venv/bin/activate
pytest -q tests/test_accommodation_service.py
flake8 app/models/accommodation.py app/schemas/accommodation.py --max-line-length=100
```

Expected: all tests pass, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add app/models/accommodation.py app/schemas/accommodation.py
git commit -m "feat: add check_in_time/check_out_time to accommodation model and schema"
```

---

## Task 3: Frontend types

**Files:**
- Modify: `frontend/lib/types.ts`

- [ ] **Step 1: Add time fields to the TypeScript Accommodation interface**

In `frontend/lib/types.ts`, find the `Accommodation` interface (around line 285) and add the two time fields:

```typescript
export interface Accommodation {
  id: number;
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;   // "HH:MM"
  check_out_time?: string;  // "HH:MM"
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
}
```

Also update `AccommodationCreate` (around line 305) to add the optional time fields:

```typescript
export interface AccommodationCreate {
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
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
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/lib/types.ts
git commit -m "feat: add check_in_time/check_out_time to frontend Accommodation types"
```

---

## Task 4: Accommodation form — add time inputs

**Files:**
- Modify: `frontend/components/accommodations/AccommodationForm.tsx`

The form currently has a 2-column date grid. Replace it with a 2×2 layout: date left, time right for each row.

- [ ] **Step 1: Update the EMPTY constant and useEffect to include time fields**

In `AccommodationForm.tsx`:

1. Update `EMPTY` (around line 16):
```typescript
const EMPTY: AccommodationCreate = {
  destination_id: 0,
  trip_id: 0,
  name: '',
  address: '',
  check_in_date: '',
  check_in_time: '',
  check_out_date: '',
  check_out_time: '',
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
```

2. Update the `useEffect` that populates the edit form (around line 52):
```typescript
  useEffect(() => {
    if (editing) {
      setForm({
        destination_id: destinationId,
        trip_id: tripId,
        name: editing.name,
        address: editing.address ?? '',
        check_in_date: editing.check_in_date,
        check_in_time: editing.check_in_time ?? '',
        check_out_date: editing.check_out_date,
        check_out_time: editing.check_out_time ?? '',
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
```

- [ ] **Step 2: Replace the date grid in the JSX with date+time rows**

Find the `<div className="grid grid-cols-2 gap-3">` that contains the check-in/check-out date inputs and replace it with:

```tsx
          {/* Check-in row: date + optional time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in date <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in time</label>
              <input
                type="time"
                value={form.check_in_time ?? ''}
                onChange={(e) => set('check_in_time', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Check-out row: date + optional time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.check_out_date}
                onChange={(e) => set('check_out_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time</label>
              <input
                type="time"
                value={form.check_out_time ?? ''}
                onChange={(e) => set('check_out_time', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
```

- [ ] **Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/components/accommodations/AccommodationForm.tsx
git commit -m "feat: add check-in/check-out time inputs to AccommodationForm"
```

---

## Task 5: AccommodationBlock timeline component

**Files:**
- Create: `frontend/components/accommodations/AccommodationBlock.tsx`
- Modify: `frontend/components/accommodations/index.ts`

- [ ] **Step 1: Create AccommodationBlock.tsx**

```tsx
import { Home } from 'lucide-react';
import { Accommodation } from '@/lib/types';

interface AccommodationBlockProps {
    accommodation: Accommodation;
    type: 'check-in' | 'check-out';
    onClick?: () => void;
}

const DAY_START_MINS = 7 * 60; // 7am

function timeToMins(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

const STYLE = {
    'check-in': {
        border: '#16a34a',
        iconColor: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Check-in',
        textColor: 'text-green-800',
    },
    'check-out': {
        border: '#d97706',
        iconColor: 'text-amber-600',
        bg: 'bg-amber-50',
        label: 'Check-out',
        textColor: 'text-amber-800',
    },
} as const;

export const AccommodationBlock = ({ accommodation, type, onClick }: AccommodationBlockProps) => {
    const time = type === 'check-in' ? accommodation.check_in_time : accommodation.check_out_time;
    if (!time) return null;

    const startMins = timeToMins(time);
    const topOffsetMins = Math.max(0, startMins - DAY_START_MINS);
    const topRem = (topOffsetMins / 60) * 4;
    const heightRem = 3;

    const s = STYLE[type];

    return (
        <div
            onClick={onClick}
            className={`absolute left-0 right-0 ${s.bg} rounded-r-lg shadow-sm border border-slate-100 cursor-pointer overflow-hidden transition-all hover:shadow-md`}
            style={{ top: `${topRem}rem`, height: `${heightRem}rem`, zIndex: 10, borderLeft: `3px solid ${s.border}` }}
        >
            <div className="flex items-center gap-2 px-2.5 py-2">
                <Home className={`w-4 h-4 shrink-0 ${s.iconColor}`} />
                <div className="min-w-0">
                    <h4 className={`font-semibold text-sm leading-tight truncate ${s.textColor}`}>
                        {s.label}: {accommodation.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                        {time}
                        {accommodation.address ? ` · ${accommodation.address}` : ''}
                        {accommodation.confirmation_number ? ` · ${accommodation.confirmation_number}` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Export from index.ts**

In `frontend/components/accommodations/index.ts`, add the new export:

```typescript
export { AccommodationCard } from './AccommodationCard';
export { AccommodationForm } from './AccommodationForm';
export { AccommodationList } from './AccommodationList';
export { AccommodationDayBadge } from './AccommodationDayBadge';
export { AccommodationBlock } from './AccommodationBlock';
export { useAccommodations } from './useAccommodations';
export { useTripAccommodations } from './useTripAccommodations';
```

- [ ] **Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/components/accommodations/AccommodationBlock.tsx \
              frontend/components/accommodations/index.ts
git commit -m "feat: add AccommodationBlock timeline component for check-in/check-out"
```

---

## Task 6: Wire AccommodationBlock into DayTimeline

**Files:**
- Modify: `frontend/components/days/DayTimeline.tsx`

- [ ] **Step 1: Add accommodation props and render blocks**

Replace the entire `DayTimeline.tsx` with:

```tsx
import { DayActivity, TripTransport, Accommodation } from '@/lib/types';
import { ActivityBlock } from './ActivityBlock';
import { TransportBlock } from './TransportBlock';
import { AccommodationBlock } from '@/components/accommodations';
import { TRANSPORT_ICON, TRANSPORT_COLOR } from '@/lib/transport-config';

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
    /** ID of the item being hovered from the map side (activity id or "transport-{id}") */
    highlightedItemId?: string | null;
    /** Called when a timeline item is hovered (for map panning) */
    onItemHover?: (id: string | null) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am to 11pm (23:00)

export const DayTimeline = ({
    scheduled,
    unscheduled,
    onEditActivity,
    transportItems = [],
    currentDayId,
    currentDayDate,
    accommodations = [],
    onEditTransport,
    highlightedActivityId,
    highlightedItemId,
    onItemHover,
}: DayTimelineProps) => {
    const checkInAccommodations = currentDayDate
        ? accommodations.filter(a => a.check_in_date === currentDayDate && a.check_in_time)
        : [];
    const checkOutAccommodations = currentDayDate
        ? accommodations.filter(a => a.check_out_date === currentDayDate && a.check_out_time)
        : [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 relative">
            <div className="relative border-l border-slate-200 ml-10 pb-10">
                {/* Time grid backdrop */}
                <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
                    {HOURS.map((hour) => {
                        const displayHour = hour > 12 ? hour - 12 : hour;
                        const ampm = hour >= 12 ? 'pm' : 'am';
                        return (
                            <div key={hour} className="h-16 relative group">
                                {/* Hairline hour rule */}
                                <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
                                {/* Rail dot */}
                                <span className="absolute -left-[5px] top-0 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors" />
                                {/* Time label */}
                                <span className="absolute -left-[3.5rem] top-0 -translate-y-1/2 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 w-11 text-right transition-colors">
                                    {displayHour}{ampm}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Render activities, transport, and accommodation blocks */}
                <div className="relative w-full h-272"> {/* 17 hours * 4rem */}
                    {scheduled.map(activity => (
                        <ActivityBlock
                            key={activity.id}
                            activity={activity}
                            onClick={() => onEditActivity(activity)}
                            highlighted={highlightedActivityId === activity.id || highlightedItemId === String(activity.id)}
                            onHover={(id) => onItemHover?.(id != null ? String(id) : null)}
                        />
                    ))}
                    {currentDayId != null && transportItems.map(t => {
                        const time = t.departure_day_id === currentDayId ? t.departure_time : t.arrival_time;
                        if (!time) return null;
                        return (
                            <TransportBlock
                                key={`transport-${t.id}`}
                                transport={t}
                                currentDayId={currentDayId}
                                onClick={() => onEditTransport?.(t)}
                                highlighted={highlightedItemId === `transport-${t.id}`}
                                onHover={onItemHover}
                            />
                        );
                    })}
                    {checkInAccommodations.map(a => (
                        <AccommodationBlock
                            key={`checkin-${a.id}`}
                            accommodation={a}
                            type="check-in"
                        />
                    ))}
                    {checkOutAccommodations.map(a => (
                        <AccommodationBlock
                            key={`checkout-${a.id}`}
                            accommodation={a}
                            type="check-out"
                        />
                    ))}
                </div>
            </div>

            {/* Unscheduled / Anytime block */}
            {unscheduled.length > 0 && (
                <div className="mt-8 border-t border-dashed border-slate-200 pt-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Anytime / Unscheduled</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {unscheduled.map(activity => (
                            <div
                                key={activity.id}
                                onClick={() => onEditActivity(activity)}
                                className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group flex items-start justify-between"
                            >
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{activity.title}</h4>
                                    <p className="text-xs text-slate-400 mt-1 capitalize">{activity.category || 'Other'}</p>
                                </div>
                                <span className="text-slate-200 group-hover:text-slate-400 text-lg leading-none">›</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unscheduled transport (no departure time) */}
            {currentDayId != null && transportItems.some(t => t.departure_day_id === currentDayId && !t.departure_time) && (
                <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Transport — no time set</h3>
                    <div className="space-y-2">
                        {transportItems
                            .filter(t => t.departure_day_id === currentDayId && !t.departure_time)
                            .map(t => {
                                const Icon = TRANSPORT_ICON[t.transport_type] ?? TRANSPORT_ICON.other;
                                const color = TRANSPORT_COLOR[t.transport_type] ?? TRANSPORT_COLOR.other;
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => onEditTransport?.(t)}
                                        className="p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                                        <span className="text-sm font-medium text-slate-700">{t.origin} → {t.destination}</span>
                                        {t.carrier && <span className="text-xs text-slate-400">{t.carrier}</span>}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd .. && git add frontend/components/days/DayTimeline.tsx
git commit -m "feat: render AccommodationBlock on DayTimeline for check-in/check-out"
```

---

## Task 7: Wire DayBuilder to pass accommodations to DayTimeline

**Files:**
- Modify: `frontend/components/days/DayBuilder.tsx`

The `DayBuilder` already calls `useTripAccommodations(tripId)` and destructures `getBadgeType`. We need to also take `accommodations` from that hook and pass it to `DayTimeline`.

- [ ] **Step 1: Destructure accommodations from the hook**

Find this line in `DayBuilder.tsx`:

```tsx
    const { getBadgeType } = useTripAccommodations(tripId);
```

Replace it with:

```tsx
    const { accommodations, getBadgeType } = useTripAccommodations(tripId);
```

- [ ] **Step 2: Pass accommodations and currentDayDate to DayTimeline**

Find the `<DayTimeline` usage and add the two new props:

```tsx
                    <DayTimeline
                        scheduled={scheduled}
                        unscheduled={unscheduled}
                        onEditActivity={openEditForm}
                        transportItems={transportItems}
                        currentDayId={day.id}
                        currentDayDate={day.date}
                        accommodations={accommodations}
                        onEditTransport={openTransportEdit}
                        highlightedActivityId={highlightedActivityId}
                        highlightedItemId={hoveredItemId}
                        onItemHover={setHoveredItemId}
                    />
```

- [ ] **Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/components/days/DayBuilder.tsx
git commit -m "feat: pass accommodations to DayTimeline from DayBuilder"
```

---

## Task 8: End-to-end verification and deploy

- [ ] **Step 1: Start both servers**

Terminal 1 (backend):
```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Terminal 2 (frontend):
```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Smoke test the feature**

1. Open `http://localhost:3000`, navigate to a trip with an accommodation.
2. Open the accommodation form (edit an existing one).
3. Confirm "Check-in time" and "Check-out time" inputs appear next to the date fields.
4. Enter `14:00` for check-in time, `11:00` for check-out time. Save.
5. Navigate to the day matching the check-in date — a green "Check-in: [hotel name]" block should appear at 2pm on the timeline.
6. Navigate to the check-out day — an amber "Check-out: [hotel name]" block should appear at 11am.
7. A day in between shows only the badge (no timeline block), as before.

- [ ] **Step 3: Final lint sweep**

```bash
cd frontend && npm run lint && npx tsc --noEmit
source ../.venv/bin/activate && flake8 ../app --max-line-length=100
```

Expected: no errors.

- [ ] **Step 4: Push and deploy**

```bash
cd .. && git push origin master
```

Vercel Git integration will auto-deploy to production. Verify at `vercel ls` that a new "Ready" production deployment appears within ~2 minutes.
