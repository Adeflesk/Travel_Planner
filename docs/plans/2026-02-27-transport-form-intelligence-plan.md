# Transport Form Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `TransportForm.tsx` config-driven so each transport type shows only the fields relevant to it, with adaptive labels, a same-day-default overnight toggle with auto-detect nudge, and an overnight inference prompt in the Trip Wizard.

**Architecture:** A `TRANSPORT_CONFIG` object in `frontend/lib/transport-config.ts` drives all field visibility, labels, and placeholders. `TransportForm.tsx` reads this config — no scattered conditionals. An `overnight: bool` column is added to the `trip_transports` table (backend + migration). The Trip Wizard infers overnight legs from consecutive-day spans and surfaces an inline callout.

**Tech Stack:** FastAPI + SQLAlchemy (Python 3.13), Next.js 14 / TypeScript / Tailwind CSS, Vitest + Testing Library for unit tests.

---

## Before You Start

Activate the Python venv:
```bash
source .venv/bin/activate
```

The frontend dev server: `cd frontend && npm run dev` (port 3000)
The backend dev server: `uvicorn app.main:app --reload` (port 8000)

Key files already exist and will be modified:
- `app/models/trip_transport.py` — SQLAlchemy model (add `overnight` column)
- `app/schemas/trip_transport.py` — Pydantic schemas (add `overnight` field)
- `frontend/lib/types.ts` — TypeScript interfaces (add `overnight` to transport types)
- `frontend/components/transport/TransportForm.tsx` — the form being redesigned
- `frontend/components/trips/TripWizard.tsx` — add overnight callout in Step 3

New files to create:
- `frontend/lib/transport-config.ts` — the config object + TypeScript type
- `frontend/lib/transport-config.test.ts` — unit tests for the config
- `migrations/009_add_overnight_to_transports.py` — DB migration

---

## Task 1: Add `overnight` column to the backend

**Files:**
- Modify: `app/models/trip_transport.py`
- Modify: `app/schemas/trip_transport.py`
- Create: `migrations/009_add_overnight_to_transports.py`

### Step 1: Add the column to the SQLAlchemy model

In `app/models/trip_transport.py`, after the `booked` column (around line 25), add:

```python
overnight = Column(Boolean, nullable=False, default=False)
```

The full `booked`/`overnight` block should look like:
```python
booked = Column(Boolean, nullable=False, default=False)
overnight = Column(Boolean, nullable=False, default=False)
sort_order = Column(Integer, nullable=False, default=0)
```

### Step 2: Add `overnight` to all Pydantic schemas

In `app/schemas/trip_transport.py`:

In `TripTransportBase`, add after `booked`:
```python
overnight: bool = False
```

In `TripTransportUpdate`, add after `booked`:
```python
overnight: bool | None = None
```

### Step 3: Write the migration

Check what migrations already exist:
```bash
ls migrations/
```

Create `migrations/009_add_overnight_to_transports.py`:

```python
"""Add overnight column to trip_transports."""

from app.core.database import engine
from sqlalchemy import text


def upgrade() -> None:
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE trip_transports ADD COLUMN overnight BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.commit()


if __name__ == "__main__":
    upgrade()
    print("Migration 009: overnight column added.")
```

### Step 4: Run the migration

```bash
source .venv/bin/activate
python migrations/009_add_overnight_to_transports.py
```

Expected output:
```
Migration 009: overnight column added.
```

### Step 5: Verify the backend still starts

```bash
uvicorn app.main:app --reload
```

Hit `http://localhost:8000/docs` — the `/trip-transports/` schemas should now include `overnight: bool`.

### Step 6: Run backend tests

```bash
source .venv/bin/activate
pytest -q tests/
```

Expected: all tests pass (no failures).

### Step 7: Commit

```bash
git add app/models/trip_transport.py app/schemas/trip_transport.py migrations/009_add_overnight_to_transports.py
git commit -m "feat: add overnight field to TripTransport model and schema"
```

---

## Task 2: Create `TRANSPORT_CONFIG` in the frontend

**Files:**
- Create: `frontend/lib/transport-config.ts`
- Create: `frontend/lib/transport-config.test.ts`

### Step 1: Write the failing test first

Create `frontend/lib/transport-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TRANSPORT_CONFIG, type TransportFieldConfig } from './transport-config';

describe('TRANSPORT_CONFIG', () => {
  it('has an entry for every transport type', () => {
    const types = ['flight', 'train', 'bus', 'drive', 'ferry', 'other'];
    types.forEach(t => {
      expect(TRANSPORT_CONFIG[t], `missing config for "${t}"`).toBeDefined();
    });
  });

  it('drive hides carrier, reference, and overnight', () => {
    const cfg = TRANSPORT_CONFIG['drive'];
    expect(cfg.showCarrier).toBe(false);
    expect(cfg.showReference).toBe(false);
    expect(cfg.overnightSupported).toBe(false);
  });

  it('drive shows distance and tolls', () => {
    const cfg = TRANSPORT_CONFIG['drive'];
    expect(cfg.showDistance).toBe(true);
    expect(cfg.showTolls).toBe(true);
  });

  it('flight has adaptive carrier label "Airline"', () => {
    const cfg = TRANSPORT_CONFIG['flight'];
    expect(cfg.showCarrier).toBe(true);
    expect(cfg.carrierLabel).toBe('Airline');
    expect(cfg.carrierPlaceholder).toBe('Emirates');
  });

  it('flight has adaptive reference label "Flight number"', () => {
    const cfg = TRANSPORT_CONFIG['flight'];
    expect(cfg.showReference).toBe(true);
    expect(cfg.referenceLabel).toBe('Flight number');
    expect(cfg.referencePlaceholder).toBe('EK415');
  });

  it('train has reference label "Train code"', () => {
    const cfg = TRANSPORT_CONFIG['train'];
    expect(cfg.referenceLabel).toBe('Train code');
    expect(cfg.referencePlaceholder).toBe('AVE 3041');
  });

  it('flight supports overnight', () => {
    expect(TRANSPORT_CONFIG['flight'].overnightSupported).toBe(true);
  });

  it('ferry shows distance', () => {
    expect(TRANSPORT_CONFIG['ferry'].showDistance).toBe(true);
  });

  it('train and bus show frequency', () => {
    expect(TRANSPORT_CONFIG['train'].showFrequency).toBe(true);
    expect(TRANSPORT_CONFIG['bus'].showFrequency).toBe(true);
  });
});
```

### Step 2: Run test to confirm it fails

```bash
cd frontend && npx vitest run lib/transport-config.test.ts
```

Expected: FAIL — `Cannot find module './transport-config'`

### Step 3: Create the config

Create `frontend/lib/transport-config.ts`:

```typescript
export type TransportFieldConfig = {
  showCarrier: boolean;
  carrierLabel?: string;
  carrierPlaceholder?: string;
  showReference: boolean;
  referenceLabel?: string;
  referencePlaceholder?: string;
  showDistance: boolean;
  showTolls: boolean;
  showFrequency: boolean;
  overnightSupported: boolean;
};

export const TRANSPORT_CONFIG: Record<string, TransportFieldConfig> = {
  flight: {
    showCarrier: true,
    carrierLabel: 'Airline',
    carrierPlaceholder: 'Emirates',
    showReference: true,
    referenceLabel: 'Flight number',
    referencePlaceholder: 'EK415',
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
  train: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Renfe',
    showReference: true,
    referenceLabel: 'Train code',
    referencePlaceholder: 'AVE 3041',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  bus: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'FlixBus',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BK-123',
    showDistance: false,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  drive: {
    showCarrier: false,
    showReference: false,
    showDistance: true,
    showTolls: true,
    showFrequency: false,
    overnightSupported: false,
  },
  ferry: {
    showCarrier: true,
    carrierLabel: 'Operator',
    carrierPlaceholder: 'Brittany Ferries',
    showReference: true,
    referenceLabel: 'Booking ref',
    referencePlaceholder: 'BF-9876',
    showDistance: true,
    showTolls: false,
    showFrequency: true,
    overnightSupported: true,
  },
  other: {
    showCarrier: true,
    carrierLabel: 'Carrier',
    showReference: true,
    referenceLabel: 'Reference',
    showDistance: false,
    showTolls: false,
    showFrequency: false,
    overnightSupported: true,
  },
};
```

### Step 4: Run test to confirm it passes

```bash
cd frontend && npx vitest run lib/transport-config.test.ts
```

Expected: all tests PASS.

### Step 5: Commit

```bash
git add frontend/lib/transport-config.ts frontend/lib/transport-config.test.ts
git commit -m "feat: add TRANSPORT_CONFIG for type-aware form field visibility"
```

---

## Task 3: Add `overnight` to frontend TypeScript types

**Files:**
- Modify: `frontend/lib/types.ts`

### Step 1: Open the file and locate `TripTransport`

In `frontend/lib/types.ts`, find the `TripTransport` interface (around line 134). It currently ends with `options?: TransportOption[]`.

Add `overnight: boolean;` after the `booked` field:

```typescript
export interface TripTransport {
  id: number;
  trip_id: number;
  transport_type: TransportType;
  origin: string;
  destination: string;
  departure_day_id?: number;
  arrival_day_id?: number;
  departure_time?: string;
  arrival_time?: string;
  carrier?: string;
  reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  booked: boolean;
  overnight: boolean;       // ← add this
  sort_order: number;
  extra?: Record<string, unknown>;
  options?: TransportOption[];
}
```

Also add `overnight` to `TripTransportCreate` (around line 155) as optional:

```typescript
export interface TripTransportCreate {
  // ... existing fields ...
  booked?: boolean;
  overnight?: boolean;      // ← add this
  sort_order?: number;
  extra?: Record<string, unknown>;
}
```

### Step 2: Type-check

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors (the form doesn't use `overnight` yet — that's Task 4).

### Step 3: Commit

```bash
git add frontend/lib/types.ts
git commit -m "feat: add overnight field to TripTransport TypeScript types"
```

---

## Task 4: Rewrite `TransportForm.tsx` — config-driven adaptive fields

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`

The current form always shows "Carrier" and "Reference" with generic labels, and always shows an arrival day picker. This task replaces that with config-driven rendering.

**Read the current file first** to understand its full structure before editing.

### Step 1: Add the config import at the top of `TransportForm.tsx`

After the existing imports, add:

```typescript
import { TRANSPORT_CONFIG } from '@/lib/transport-config';
```

### Step 2: Add the `overnight` state variable

In the component's state declarations, add after `booked`:

```typescript
const [overnight, setOvernight] = useState(initialData?.overnight ?? false);
```

### Step 3: Derive the active config

After the state declarations, add:

```typescript
const cfg = TRANSPORT_CONFIG[type] ?? TRANSPORT_CONFIG['other'];
```

### Step 4: Replace the static "Carrier + Reference" grid

Find this block (around line 155 in the current file):

```tsx
{/* Carrier + Reference */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Carrier</label>
    <input className={inputCls} value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Vueling, Renfe" />
  </div>
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {type === 'flight' ? 'Flight no.' : 'Reference'}
    </label>
    <input className={inputCls} value={reference} onChange={e => setReference(e.target.value)} placeholder="Booking ref / code" />
  </div>
</div>
```

Replace it with:

```tsx
{/* Carrier + Reference — config-driven */}
{(cfg.showCarrier || cfg.showReference) && (
  <div className={`grid gap-3 ${cfg.showCarrier && cfg.showReference ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {cfg.showCarrier && (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {cfg.carrierLabel ?? 'Carrier'}
        </label>
        <input
          className={inputCls}
          value={carrier}
          onChange={e => setCarrier(e.target.value)}
          placeholder={cfg.carrierPlaceholder ?? ''}
        />
      </div>
    )}
    {cfg.showReference && (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {cfg.referenceLabel ?? 'Reference'}
        </label>
        <input
          className={inputCls}
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder={cfg.referencePlaceholder ?? ''}
        />
      </div>
    )}
  </div>
)}
```

### Step 5: Replace the static type-specific extras block

Find the existing type-specific extras block (the three conditionals for flight, drive, train/bus/ferry) and replace with:

```tsx
{/* Type-specific extras — config-driven */}
{cfg.showDistance && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Distance (km)</label>
    <input
      className={inputCls}
      type="number"
      value={distanceKm}
      onChange={e => setDistanceKm(e.target.value)}
      placeholder="e.g. 450"
    />
  </div>
)}
{cfg.showTolls && (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={(initialData?.extra?.tolls as boolean) ?? false}
      onChange={e => {
        // stored via extra in handleSubmit
        const el = e.currentTarget;
        setDistanceKm(prev => prev); // trigger re-render; tolls read from DOM in submit
        el.dataset.tolls = el.checked ? '1' : '0';
      }}
      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
    />
    <span className="text-sm font-medium text-slate-700">Toll roads on this route</span>
  </label>
)}
{cfg.showFrequency && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
    <input
      className={inputCls}
      value={frequency}
      onChange={e => setFrequency(e.target.value)}
      placeholder="e.g. every 2 hours, 3× daily"
    />
  </div>
)}
```

> **Note on tolls:** The tolls toggle stores its value in `extra.tolls`. Add `tolls` state alongside the other extras state variables:
> ```typescript
> const [tolls, setTolls] = useState<boolean>((initialData?.extra?.tolls as boolean) ?? false);
> ```
> Then replace the inline `el.dataset.tolls` approach above with:
> ```tsx
> onChange={e => setTolls(e.target.checked)}
> checked={tolls}
> ```
> And in `handleSubmit`, add: `if (cfg.showTolls) extra.tolls = tolls;`

### Step 6: Add `overnight` to handleSubmit

In `handleSubmit`, add `overnight` to the data object:

```typescript
const data: TripTransportCreate = {
  // ... existing fields ...
  booked,
  overnight,          // ← add
  // ...
};
```

### Step 7: Type-check and lint

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Fix any errors before continuing.

### Step 8: Commit

```bash
git add frontend/components/transport/TransportForm.tsx
git commit -m "feat: make TransportForm config-driven with adaptive labels and field visibility"
```

---

## Task 5: Add overnight toggle + auto-detect nudge to TransportForm

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`

### Step 1: Replace the static arrival day + time block

Find the "Arrival day + time" grid (it's always visible currently). Replace it with a conditional block that only shows when overnight is on OR when the type doesn't support overnight:

```tsx
{/* Overnight toggle — only for overnight-capable types */}
{cfg.overnightSupported && (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={overnight}
      onChange={e => {
        setOvernight(e.target.checked);
        if (!e.target.checked) {
          // Reset arrival day to departure day when toggling off
          setArrDayId(depDayId);
        } else {
          // Advance arrival day by 1 when toggling on
          const depDay = tripDays.find(d => d.id === parseInt(depDayId, 10));
          if (depDay) {
            const depIndex = tripDays.indexOf(depDay);
            const nextDay = tripDays[depIndex + 1];
            if (nextDay) setArrDayId(nextDay.id.toString());
          }
        }
      }}
      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
    />
    <span className="text-sm font-medium text-slate-700">Crosses midnight / Overnight</span>
  </label>
)}

{/* Arrival day picker — only shown when overnight is on */}
{overnight && cfg.overnightSupported && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Arrival day</label>
      <select className={inputCls} value={arrDayId} onChange={e => setArrDayId(e.target.value)}>
        <option value="">— none —</option>
        {tripDays.map(d => (
          <option key={d.id} value={d.id}>{formatDayLabel(d)}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
      <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
    </div>
  </div>
)}

{/* For non-overnight-capable types (drive), always show arrival time only */}
{!cfg.overnightSupported && (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Departure time</label>
      <input className={inputCls} type="time" value={depTime} onChange={e => setDepTime(e.target.value)} />
    </div>
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Arrival time</label>
      <input className={inputCls} type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} />
    </div>
  </div>
)}
```

> **Also update the departure day + time block** to remove arrival time from it (since arrival time is now handled separately above). The departure row should only contain: departure day + departure time.

### Step 2: Add the auto-detect nudge

After the time fields, add the nudge (shown when arrival < departure and overnight is off):

```tsx
{/* Auto-detect overnight nudge */}
{cfg.overnightSupported && !overnight && depTime && arrTime && arrTime < depTime && (
  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
    <span className="text-amber-600">⚠</span>
    <span className="text-amber-800 flex-1">Arrival before departure — travelling overnight?</span>
    <button
      type="button"
      onClick={() => {
        setOvernight(true);
        const depDay = tripDays.find(d => d.id === parseInt(depDayId, 10));
        if (depDay) {
          const depIndex = tripDays.indexOf(depDay);
          const nextDay = tripDays[depIndex + 1];
          if (nextDay) setArrDayId(nextDay.id.toString());
        }
      }}
      className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 whitespace-nowrap"
    >
      Set overnight
    </button>
  </div>
)}
```

### Step 3: Type-check and lint

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

### Step 4: Commit

```bash
git add frontend/components/transport/TransportForm.tsx
git commit -m "feat: add overnight toggle and auto-detect nudge to TransportForm"
```

---

## Task 6: Add overnight inference callout to TripWizard

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`

The wizard currently has a Step 3 for "Transport" that shows Trip Style and Air Travel preferences. We need to add an overnight inference callout here.

**Read the current file first** before editing.

### Step 1: Understand the wizard data shape

The wizard collects `data.start_date`, `data.end_date`, and `data.flight_type`. It does NOT yet have per-leg transport entries — that happens after trip creation on the day pages.

The callout is therefore a "heads up" prompt: if the wizard detects that the trip has consecutive days (which all multi-day trips do) and the user has selected a flight type other than 'none', ask if any legs are overnight.

Add `overnight_flight: boolean` to the wizard data state.

### Step 2: Add `overnight_flight` to wizard state

Find the `useState` for the wizard form data (near the top of `TripWizard.tsx`). Add `overnight_flight: false` to the initial state:

```typescript
const [data, setData] = useState({
  // ... existing fields ...
  overnight_flight: false,
});
```

### Step 3: Add the callout to Step 3

At the bottom of the Step 3 JSX block (after the Air Travel options, before the closing `</div>`), add:

```tsx
{/* Overnight inference callout — shown when a flight type is selected */}
{data.flight_type !== 'none' && data.flight_type !== '' && (
  <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
    <p className="text-sm font-semibold text-sky-900">
      ✈ Will any of your flights cross midnight?
    </p>
    <p className="text-xs text-sky-700">
      If you depart one day and arrive the next, we&apos;ll flag those legs as overnight when you build your itinerary.
    </p>
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => set({ overnight_flight: true })}
        className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
          data.overnight_flight
            ? 'bg-sky-600 text-white border-sky-600'
            : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
        }`}
      >
        Yes, overnight
      </button>
      <button
        type="button"
        onClick={() => set({ overnight_flight: false })}
        className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
          !data.overnight_flight
            ? 'bg-slate-100 text-slate-700 border-slate-300'
            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
        }`}
      >
        No, same-day arrivals
      </button>
    </div>
  </div>
)}
```

> The `overnight_flight` preference is collected for user awareness and future use (e.g. pre-populating transport forms). It does not need to be saved to the backend in this iteration.

### Step 4: Type-check and lint

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

### Step 5: Commit

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "feat: add overnight inference callout to TripWizard Step 3"
```

---

## Task 7: Run full verification

### Step 1: Run all unit tests

```bash
cd frontend && npx vitest run
```

Expected: all tests pass, including the new `transport-config.test.ts`.

### Step 2: Run backend tests

```bash
source .venv/bin/activate && pytest -q tests/
```

Expected: all pass.

### Step 3: Run lint + type-check

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: zero errors.

### Step 4: Manual smoke test

1. Start both servers
2. Open any trip → click a day → "Add Transport"
3. Select **Drive**: confirm no Carrier, no Reference, no Overnight toggle — Distance and Tolls visible
4. Select **Flight**: confirm "Airline" label with "Emirates" placeholder, "Flight number" with "EK415" placeholder
5. Select **Train**: confirm "Operator" / "Renfe", "Train code" / "AVE 3041", Frequency field visible
6. On any overnight-capable type: enter arrival time earlier than departure time → confirm amber nudge appears
7. Click "Set overnight" → confirm toggle flips, arrival day picker appears
8. Create a new trip → reach Step 3 → select a flight type → confirm overnight callout appears

### Step 5: Commit if any small fixes were needed

```bash
git add -p
git commit -m "fix: address smoke test findings in transport form"
```

---

## Summary of Files Changed

| File | Change |
|---|---|
| `app/models/trip_transport.py` | Add `overnight` column |
| `app/schemas/trip_transport.py` | Add `overnight` field to all schemas |
| `migrations/009_add_overnight_to_transports.py` | New migration |
| `frontend/lib/transport-config.ts` | New — config object |
| `frontend/lib/transport-config.test.ts` | New — unit tests |
| `frontend/lib/types.ts` | Add `overnight` to transport interfaces |
| `frontend/components/transport/TransportForm.tsx` | Config-driven fields, overnight toggle, nudge |
| `frontend/components/trips/TripWizard.tsx` | Overnight callout on Step 3 |
