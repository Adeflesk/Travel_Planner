# Implementation Plan: Destination ↔ Day Link

**Date:** 2026-02-28  
**Status:** Draft  
**Prerequisite for:** [Day Map](./2026-02-28-day-map-leaflet.md)

---

## Prerequisites (Completed)

- [x] ✅ **Wrap DayPage in TripProvider** — The `/trips/[id]/days/[dayId]/page.tsx` was missing `TripProvider` context. Fixed: now fetches the trip and wraps `DayBuilder` in `TripProvider`, so `useTripCurrency()`, the upcoming destination picker, and map components all have access to trip context.

## Context

### Stops → Destinations
The old Journey/Segment system had a "Stops" concept (`journey_stops` table) for intermediate points along a journey. That entire system was **removed** in the transport redesign (see `2026-02-27-transport-redesign-design.md`). The current architecture uses:

- **Destinations** — the "places you're visiting" on a trip (city-level)
- **TripDays** — individual days in your itinerary
- **DayActivities** — scheduled items within a day
- **TripTransport** — how you get between places (linked to days)

Destinations are effectively the modern replacement for the old "stops" concept — they represent the cities/places on your route. This plan links them to days so you always know "where am I today?"

### Current Gap
**Destinations and Days are currently independent** — they both belong to a Trip but have no direct FK linking them. The `TripDay.location` is just freetext, and `Destination.arrival_date`/`departure_date` are date-only fields with no link to `TripDay` records.

---

## Design Decision: Simple FK vs Junction Table

**Chosen: Simple FK** (`destination_id` on `TripDay`)

| Approach | Pros | Cons |
|---|---|---|
| **FK on TripDay** ✅ | Simple, covers 90% of cases, easy queries | One destination per day only |
| Junction table | Many-to-many, "start"/"end" position column | Over-engineering, complex UI |

For travel days where you move between cities, the existing `TripTransport` model already captures the from → to semantics with `departure_day_id` / `arrival_day_id`. A simple FK covers the "where am I staying tonight?" question.

---

## Tasks

### Task 1: Backend Model + Migration

**File:** `app/models/trip_day.py`

```python
# Add to TripDay model
destination_id = Column(
    Integer,
    ForeignKey("destinations.id", ondelete="SET NULL"),
    nullable=True,
)

# Add relationship
destination = relationship("Destination", backref="days")
```

**Migration:** `migrations/add_destination_id_to_trip_days.py`
- `ALTER TABLE trip_days ADD COLUMN destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL`
- Backfill: match existing `trip_days.location` text against `destinations.name` for the same trip

**File:** `app/core/migrations.py`
- Add `destination_id` to the `trip_day_columns` list

### Task 2: Update Schemas

**File:** `app/schemas/trip_day.py`
- Add `destination_id: Optional[int] = None` to `TripDayBase`, `TripDayCreate`, `TripDayUpdate`
- Add `destination_id: Optional[int] = None` to `TripDayResponse`

### Task 3: Backend Tests

**File:** `tests/test_trip_day_destination.py`
- Test creating a day with `destination_id`  
- Test response includes `destination_id`
- Test updating `destination_id`
- Test that deleting a destination sets `destination_id = NULL` (not cascade-delete the day)

### Task 4: Frontend Types

**File:** `frontend/lib/types.ts`
```typescript
// Update TripDay interface
export interface TripDay {
  // ... existing fields
  destination_id?: number;
}

// Update TripDayCreate
export interface TripDayCreate {
  // ... existing fields
  destination_id?: number;
}
```

### Task 5: Destination Picker Component

**New file:** `frontend/components/days/DestinationPicker.tsx`

A dropdown that appears in the DayHeader or DayForm:
- Lists existing destinations for this trip
- "Create New Destination…" option at bottom → opens inline mini-form (name + country)
- On select → PATCH the day's `destination_id`
- Auto-updates `day.location` text from `destination.name` (unless user has a custom override)

### Task 6: Integrate Picker into DayHeader + DayForm

**Files:** `DayHeader.tsx`, `DayForm.tsx`, `DayBuilder.tsx`

- `DayHeader.tsx` — show current destination with a [Change ▾] button
- `DayForm.tsx` — add destination picker field
- `DayBuilder.tsx` — handle destination change callbacks

**UI concept:**
```
┌──────────────────────────────────────────┐
│ ● Day Header                             │
│ ┌──────────────────────────────────────┐  │
│ │ 📍 Paris, France          [Change ▾] │  │
│ │   ↳ Destination linked               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ Timeline...                              │
└──────────────────────────────────────────┘
```

### Task 7: Auto-Create Days from Destination

**Where:** `DestinationForm.tsx` or `useDestinationForm.ts`

When saving a destination with `arrival_date` → `departure_date`:
- Show a prompt: "Create itinerary days for {name} ({arrival} – {departure})?"
- If accepted, POST one `TripDayCreate` per date in range, each with:
  - `destination_id` = new destination's id
  - `location` = destination name
  - `title` = "" (user can fill in later)

### Task 8: Smoke Test
- Create a destination with dates → verify days auto-created
- Open a day → pick a destination → verify it links
- Delete a destination → verify day still exists with `destination_id = NULL`

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `migrations/add_destination_id_to_trip_days.py` | Migration script |
| `tests/test_trip_day_destination.py` | Backend tests |
| `frontend/components/days/DestinationPicker.tsx` | Dropdown + inline create |

### Modified Files
| File | Changes |
|---|---|
| `app/models/trip_day.py` | Add `destination_id` FK + relationship |
| `app/schemas/trip_day.py` | Add `destination_id` to schemas |
| `app/core/migrations.py` | Register new column |
| `frontend/lib/types.ts` | Add `destination_id` to TripDay types |
| `frontend/components/days/DayHeader.tsx` | Show destination + picker |
| `frontend/components/days/DayForm.tsx` | Destination picker field |
| `frontend/components/days/DayBuilder.tsx` | Handle destination change |
| `frontend/components/destinations/DestinationForm.tsx` | Auto-create days prompt |

---

## Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Simple FK not junction table | 90% of days are at one destination; transport handles "between" semantics |
| 2 | Bi-directional auto-creation | User can start from either Destinations tab or Days tab |
| 3 | `ON DELETE SET NULL` | Deleting a destination shouldn't delete your day plans |
| 4 | Old "stops" → covered by Destinations | Transport redesign removed journeys/stops; destinations are the "places" |
