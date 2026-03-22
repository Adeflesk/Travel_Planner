# Wizard Simplification & Preference Intelligence

**Date:** 2026-03-12
**Status:** Draft

## Problem

The trip wizard collects 14 fields across 5 steps, but most "preference" fields (`vehicle`, `flight_type`, `accommodation`, `overnight_flight`) are stored in a JSON blob and **never consumed by any downstream logic**. Users spend time answering questions that don't improve their experience. Additionally, `overnight_flight` is collected in the UI but never stored — it's dead code.

The `TransportForm` already handles overnight detection contextually (prompting "travelling overnight?" when arrival < departure), making the wizard's upfront question redundant.

## Solution

1. Simplify the wizard from 5 steps → 3 steps by removing the Transport and Stay & Pace steps
2. Remove `overnight_flight` dead code
3. Wire the remaining context preferences to produce visible defaults downstream
4. Infer `trip_type` from data rather than asking upfront

## Design

### Wizard Structure — Before vs After

**Before (5 steps):**
```
Step 1: The Basics     — name, dates, locations, timezone, description
Step 2: Travellers     — traveller_count, split_costs
Step 3: Transport      — trip_type, vehicle, flight_type, overnight_flight
Step 4: Stay & Pace    — accommodation, pacing
Step 5: Budget         — budget, budget_currency
```

**After (3 steps):**
```
Step 1: The Basics     — name, dates, locations, timezone, description
Step 2: Travellers     — traveller_count, split_costs
Step 3: Budget         — budget, budget_currency, per-person preview
```

### What Happens to Each Removed Field

| Field | Current Wizard Step | Removal Strategy |
|---|---|---|
| `trip_type` | Step 3 | Default to `'single_city'`. Infer → `'multi_city'` when 2+ destinations exist. Editable in TripSettings |
| `vehicle` | Step 3 | Default to `'none'`. Editable in TripSettings. Future: influence transport form default type |
| `flight_type` | Step 3 | Default to `'none'`. Editable in TripSettings. Future: infer from transport legs |
| `overnight_flight` | Step 3 | **Delete entirely** — not in `TripContext`, not stored. `TransportForm` handles overnight detection contextually |
| `accommodation` | Step 4 | Default to `'unknown'`. Editable in TripSettings. Future: pre-select type in accommodation form |
| `pacing` | Step 4 | Default to `'balanced'`. Editable in TripSettings. Already functional via `stopDurationHours()` |

### UI Changes — Step 3 (Budget)

Add a per-person budget preview when `traveller_count > 1` and a budget is entered:

```
Total budget  [5000] [AUD ▼]

  ℹ That's $2,500 per person (2 travellers)
```

This immediately validates the traveller count by showing a useful derived value. The preview line uses the existing `traveller_count` from Step 2 and the budget from the current step. Display format: `$X,XXX per person (N travellers)`.

Show the preview only when:
- `traveller_count > 1`
- `data.budget` is non-empty and parses to a positive number

### What Stays the Same

- `TripContext` interface — no fields removed
- Backend `context` JSON column — no schema change
- `TripSettings` — still edits all context fields post-creation
- `handleSubmit` output shape — still passes full `TripContext` with all defaults (`trip_type: 'single_city'`, `vehicle: 'none'`, `flight_type: 'none'`, `accommodation: 'unknown'`, `pacing: 'balanced'`)
- Step 1 and Step 2 content — unchanged
- Step indicator visuals — same pill style, just 3 instead of 5
- `canNext()` validation — unchanged (only Step 1 has required fields)

### Component Changes

#### `TripWizard.tsx` (modify)

**State changes:**
- Remove `overnight_flight` from `WizardData` interface and `defaults`
- Keep `trip_type`, `vehicle`, `flight_type`, `accommodation`, `pacing` in `WizardData` and `defaults` — they're still passed to `handleSubmit` → `TripContext`

**Step changes:**
- Delete the entire `{step === 3 && ( ... )}` block (old Transport step)
- Delete the entire `{step === 4 && ( ... )}` block (old Stay & Pace step)
- Renumber: old Step 5 (Budget) becomes Step 3
- Update step indicator from `[1, 2, 3, 4, 5]` to `[1, 2, 3]`
- Update step labels from `['The Basics', 'Travellers', 'Transport', 'Stay & Pace', 'Budget']` to `['The Basics', 'Travellers', 'Budget']`
- Add per-person budget preview line to new Step 3
- Update `step < 5` → `step < 3` in navigation
- Keep `handleSubmit` passing all context fields with their defaults

**Import changes:**
- None required

#### `geocode-utils` cleanup in `TripWizard.tsx` (modify)

- Replace `import type { Coordinates } from '@/lib/geocode-utils'` with an inline type: `type Coords = { lat: number; lng: number }`
- Update `validatedCoords` ref type from `Coordinates` to `Coords`
- This removes the wizard's last dependency on geocode-utils

#### Nominatim fallback cleanup in `trips/page.tsx` (modify)

In `handleCreateTrip`:
- Remove the `geocodeAddress` fallback for `home_base_coords` (lines 64–66) — if `data.home_base_coords` is null, just skip the `tripApi.update` call
- Remove the `geocodeAddress` fallback for `first_destination_coords` (lines 91–93) — if `data.first_destination_coords` is null, skip the `destinationApi.update` call
- Remove the `import { geocodeAddress, Coordinates } from '@/lib/geocode-utils'` — switch to `import type { Coordinates } from '@/lib/geocode-utils'` (or remove entirely if Coordinates is replaced inline)

**Rationale:** The wizard now uses Mapbox `TransportLocationSearch` which provides coords on selection. The Nominatim fallback was for the old plain `<Input>` fields and is no longer needed. If a user types without selecting from Mapbox, no coords are captured — this is acceptable (same as typing gibberish in the old flow).

### Future: `trip_type` Auto-Inference (deferred)

When the user adds a 2nd destination to a trip:
- Auto-update `context.trip_type` from `'single_city'` to `'multi_city'`
- Show a non-blocking toast: "Trip type updated to Multi-City"
- This only fires when transitioning from exactly 1 → 2 destinations, not on every destination add

This is **deferred** — not part of the initial simplification. Current behavior (defaulting to `single_city`) is acceptable.

### Future: Transport Form Defaults from Context (deferred)

When `context.vehicle === 'own_car'` or `'rental'`:
- Default the `TransportForm` type selector to `'drive'` instead of `'flight'`
- Only applies when creating a new transport (not editing existing)

This is **deferred** — requires changes to `TransportForm` and `useTransport`.

### Edge Cases

- **Existing trips with context fields set:** Unaffected. The fields are still stored and editable in TripSettings. Only the wizard creation flow changes
- **User skips Steps 2 and 3:** Steps 2 (Travellers) and 3 (Budget) have no required fields — all optional. Navigation proceeds normally
- **Per-person preview with 1 traveller:** Hidden (condition: `traveller_count > 1`)
- **Budget entered as 0:** Preview hidden (condition: positive number)
- **Non-numeric budget input:** `<input type="number">` handles this — browser rejects non-numeric input

### Deferred

- `trip_type` auto-inference from destination count
- Transport form defaults from `context.vehicle`
- `flight_type` inference from transport leg count
- Accommodation form defaults from `context.accommodation`
- Per-person expense splitting logic
- Wizard edit mode (reuse wizard for editing existing trip basics)
- Wizard draft persistence (localStorage)
