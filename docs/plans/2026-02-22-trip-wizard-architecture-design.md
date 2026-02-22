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
