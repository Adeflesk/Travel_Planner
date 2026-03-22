# Wizard Simplification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the trip wizard from 5 steps to 3 by removing the Transport and Stay & Pace steps, deleting `overnight_flight` dead code, adding a per-person budget preview, and cleaning up stale Nominatim fallbacks.

**Architecture:** Three independent chunks. Each chunk produces committed, passing code before the next begins. No backend changes — this is a frontend-only refactor.

**Tech Stack:** React, TypeScript, Next.js

**Spec:** `docs/superpowers/specs/2026-03-12-wizard-simplify-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `frontend/components/trips/TripWizard.tsx` | Remove Steps 3+4, delete `overnight_flight`, add per-person preview, renumber steps |
| Modify | `frontend/app/trips/page.tsx` | Remove Nominatim fallback, clean up geocode-utils import |

---

## Chunk 1: Wizard Simplification

### Task 1: Remove `overnight_flight` and Steps 3+4

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`

- [ ] **Step 1: Remove `overnight_flight` from `WizardData` and `defaults`**

In the `WizardData` interface, delete:
```tsx
    overnight_flight: boolean;
```

In the `defaults` object, remove `overnight_flight: false` from line 40:
```tsx
// was:
    trip_type: 'single_city', vehicle: 'none', flight_type: 'none', overnight_flight: false,
// becomes:
    trip_type: 'single_city', vehicle: 'none', flight_type: 'none',
```

- [ ] **Step 2: Replace geocode-utils type import with inline type**

Replace:
```tsx
import type { Coordinates } from '@/lib/geocode-utils';
```

With:
```tsx
type Coords = { lat: number; lng: number };
```

Update the `validatedCoords` ref:
```tsx
// was:
const validatedCoords = useRef<{ home_base?: Coordinates | null; first_destination?: Coordinates | null }>({});
// becomes:
const validatedCoords = useRef<{ home_base?: Coords | null; first_destination?: Coords | null }>({});
```

Update `TripWizardProps.onSubmit` — change both `Coordinates` references:
```tsx
// was:
    home_base_coords?: Coordinates;
    first_destination_coords?: Coordinates;
// becomes:
    home_base_coords?: Coords;
    first_destination_coords?: Coords;
```

- [ ] **Step 3: Delete Step 3 (Transport) JSX block**

Delete the entire `{/* Step 3: Trip type + transport */}` block — from `{step === 3 && (` through its closing `)}`. This is approximately lines 278–350 in the current file.

- [ ] **Step 4: Delete Step 4 (Stay & Pace) JSX block**

Delete the entire `{/* Step 4: Stay + pace */}` block — from `{step === 4 && (` through its closing `)}`. This is approximately lines 352–378 in the current file.

- [ ] **Step 5: Renumber steps**

Update the step indicator array:
```tsx
// was:
{[1, 2, 3, 4, 5].map((s) => (
// becomes:
{[1, 2, 3].map((s) => (
```

Update the connector condition:
```tsx
// was:
{s < 5 && <div ...
// becomes:
{s < 3 && <div ...
```

Update the "Step X of Y" text:
```tsx
// was:
<p ...>Step {step} of 5</p>
// becomes:
<p ...>Step {step} of 3</p>
```

Update the step labels:
```tsx
// was:
{['The Basics', 'Travellers', 'Transport', 'Stay & Pace', 'Budget'][step - 1]}
// becomes:
{['The Basics', 'Travellers', 'Budget'][step - 1]}
```

Update the "Next Step" condition:
```tsx
// was:
{step < 5 ? (
// becomes:
{step < 3 ? (
```

Update the Step 5 (Budget) condition — it's now Step 3:
```tsx
// was:
{step === 5 && (
// becomes:
{step === 3 && (
```

- [ ] **Step 6: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "refactor: simplify wizard from 5 steps to 3, remove overnight_flight dead code"
```

---

### Task 2: Add per-person budget preview

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`

- [ ] **Step 1: Add per-person preview to the Budget step**

In the Budget step (now Step 3), after the budget/currency grid and before the "Custom Category Limits" info box, add:

```tsx
{data.traveller_count > 1 && data.budget && parseFloat(data.budget) > 0 && (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-primary-50 border border-primary-100 rounded-xl text-sm text-primary-700">
        <span className="font-semibold">
            {new Intl.NumberFormat('en', {
                style: 'currency',
                currency: data.budget_currency,
                maximumFractionDigits: 0,
            }).format(parseFloat(data.budget) / data.traveller_count)}
        </span>
        <span className="text-primary-600">
            per person ({data.traveller_count} travellers)
        </span>
    </div>
)}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "feat: add per-person budget preview when traveller count > 1"
```

---

## Chunk 2: Cleanup Nominatim Fallback

### Task 3: Remove geocodeAddress fallback from trips/page.tsx

**Files:**
- Modify: `frontend/app/trips/page.tsx`

- [ ] **Step 1: Update the import**

Replace:
```tsx
import { geocodeAddress, Coordinates } from '@/lib/geocode-utils';
```

With:
```tsx
import type { Coordinates } from '@/lib/geocode-utils';
```

- [ ] **Step 2: Simplify home base coords update**

In `handleCreateTrip`, replace the home base geocoding block (approximately lines 62–78):

```tsx
// was:
if (tripId && data.context?.home_base) {
    // Use pre-validated coords if available, otherwise geocode now
    const homeCoords = data.home_base_coords
      ? Promise.resolve(data.home_base_coords)
      : geocodeAddress(data.context.home_base);
    homeCoords.then(coords => {
      if (coords) {
        tripApi.update(tripId, {
          context: {
            ...data.context,
            home_base_latitude: coords.lat,
            home_base_longitude: coords.lng
          }
        }).catch(console.error);
      }
    });
}
```

With:
```tsx
if (tripId && data.home_base_coords) {
    tripApi.update(tripId, {
      context: {
        ...data.context,
        home_base_latitude: data.home_base_coords.lat,
        home_base_longitude: data.home_base_coords.lng,
      }
    }).catch(console.error);
}
```

- [ ] **Step 3: Simplify first destination coords update**

Replace the destination geocoding block (approximately lines 80–114):

```tsx
// was:
if (tripId && data.first_destination) {
    destinationApi.create({
      trip_id: tripId,
      name: data.first_destination,
      timezone: data.timezone,
      arrival_date: data.start_date,
      departure_date: data.end_date,
    }).then(destRes => {
      const dest = destRes.data;

      // Use pre-validated coords if available, otherwise geocode now
      const destCoords = data.first_destination_coords
        ? Promise.resolve(data.first_destination_coords)
        : geocodeAddress(data.first_destination as string);
      destCoords.then(coords => {
        if (coords) {
          destinationApi.update(dest.id, {
            latitude: coords.lat,
            longitude: coords.lng
          }).catch(console.error);
        }
      });

      // Create days for the destination
      if (dest.arrival_date && dest.departure_date) {
        autoCreateDaysForDestination({
          tripId,
          destinationId: dest.id,
          destinationName: dest.name,
          arrivalDate: dest.arrival_date,
          departureDate: dest.departure_date,
        }).catch(console.error);
      }
    }).catch(console.error);
}
```

With:
```tsx
if (tripId && data.first_destination) {
    destinationApi.create({
      trip_id: tripId,
      name: data.first_destination,
      timezone: data.timezone,
      arrival_date: data.start_date,
      departure_date: data.end_date,
    }).then(destRes => {
      const dest = destRes.data;

      if (data.first_destination_coords) {
        destinationApi.update(dest.id, {
          latitude: data.first_destination_coords.lat,
          longitude: data.first_destination_coords.lng,
        }).catch(console.error);
      }

      // Create days for the destination
      if (dest.arrival_date && dest.departure_date) {
        autoCreateDaysForDestination({
          tripId,
          destinationId: dest.id,
          destinationName: dest.name,
          arrivalDate: dest.arrival_date,
          departureDate: dest.departure_date,
        }).catch(console.error);
      }
    }).catch(console.error);
}
```

- [ ] **Step 4: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/app/trips/page.tsx
git commit -m "refactor: remove Nominatim fallback from trip creation, use Mapbox coords directly"
```

---

## Chunk 3: Verification

### Task 4: Manual verification

- [ ] **Step 1: Start backend**

Run: `source .venv/bin/activate && uvicorn app.main:app --reload`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Test the simplified wizard**

Open `http://localhost:3000`, create a new trip:
1. Step 1 (Basics) — Fill in name, dates, locations. Verify timezone auto-detect still works
2. Step 2 (Travellers) — Set traveller count to 3. Verify split costs checkbox appears
3. Step 3 (Budget) — Enter 9000 budget. Verify per-person preview shows "$3,000 per person (3 travellers)"
4. Verify "Next Step" progresses correctly through 3 steps
5. Verify "Plan My Trip" appears on Step 3
6. Submit — verify trip is created with all context defaults
7. Open the new trip → Settings → verify all context fields are editable and show their defaults

- [ ] **Step 4: Test edge cases**

1. Create trip with 1 traveller — verify no per-person preview
2. Create trip with no budget — verify no per-person preview
3. Create trip with no first destination — verify timezone falls back to browser default
4. Verify step indicator shows 3 pills, not 5

- [ ] **Step 5: Verify existing transport form still works**

Navigate to a trip → Day → Add transport:
1. Location search still works with category filtering
2. Overnight detection still works (enter arrival time before departure → amber prompt appears)
3. No visual regressions

- [ ] **Step 6: Final lint + type check**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: PASS
