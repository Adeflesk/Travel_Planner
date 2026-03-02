# Implementation Plan: Destination ↔ Day Link

**Date:** 2026-02-28  
**Status:** Draft  
**Prerequisite for:** [Day Map](./2026-02-28-day-map-leaflet.md)

---

## Prerequisites (Completed)

- [x] ✅ **Wrap DayPage in TripProvider** — The `/trips/[id]/days/[dayId]/page.tsx` was missing `TripProvider` context. Fixed: now fetches the trip and wraps `DayBuilder` in `TripProvider`, so `useTripCurrency()`, the upcoming destination picker, and map components all have access to trip context.

---

## Context

### Stops → Destinations
The old Journey/Segment system had a "Stops" concept (`journey_stops` table) for intermediate points along a journey. That entire system was **removed** in the transport redesign (see `2026-02-27-transport-redesign-design.md`). The current architecture uses:

- **Destinations** — the "places you're visiting" on a trip (city-level)
- **TripDays** — individual days in your itinerary
- **DayActivities** — scheduled items within a day
- **TripTransport** — how you get between places (linked to days)

Destinations are effectively the modern replacement for the old "stops" concept — they represent the cities/places on your route. This plan links them to days so you always know "where am I today?"

### Current Gap
**Destinations and Days are currently independent** — they both belong to a Trip but have no direct FK linking them. The `TripDay.location` is just freetext, and `Destination.arrival_date`/`departure_date` are date-only fields with no link to `TripDay` records. Destinations also lack coordinates, making future map features impossible.

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

### Task 1: Backend — Add Coordinates to Destination Model

A destination is a place on a map. We store lat/lng at creation time so coordinates are ready when the Day Map (Phase 2) is built.

**File:** `app/models/destination.py`
```python
latitude = Column(Float, nullable=True)
longitude = Column(Float, nullable=True)
```

**File:** `app/schemas/destination.py`
- Add `latitude: Optional[float] = None`, `longitude: Optional[float] = None` to `DestinationBase`, `DestinationUpdate`, and `Destination`

**Migration:** `migrations/add_coordinates_to_destinations.py`
- `ALTER TABLE destinations ADD COLUMN latitude FLOAT`
- `ALTER TABLE destinations ADD COLUMN longitude FLOAT`
- No backfill needed (null initially; geocoded on save going forward)

**File:** `app/core/migrations.py`
- Add `latitude`, `longitude` to the destination columns list

### Task 2: Backend — Add `destination_id` FK to `TripDay`

**File:** `app/models/trip_day.py`

```python
destination_id = Column(
    Integer,
    ForeignKey("destinations.id", ondelete="SET NULL"),
    nullable=True,
)

destination = relationship("Destination", backref="days")
```

**Migration:** `migrations/add_destination_id_to_trip_days.py`
- `ALTER TABLE trip_days ADD COLUMN destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL`
- Backfill: match existing `trip_days.location` text against `destinations.name` for the same trip

**File:** `app/schemas/trip_day.py`
- Add `destination_id: Optional[int] = None` to `TripDayBase`, `TripDayCreate`, `TripDayUpdate`, `TripDayResponse`

**File:** `app/core/migrations.py`
- Add `destination_id` to the `trip_day_columns` list

### Task 3: Backend Tests

**File:** `tests/test_trip_day_destination.py`
- Test creating a day with `destination_id`
- Test response includes `destination_id`
- Test updating `destination_id`
- Test that deleting a destination sets `destination_id = NULL` (not cascade-delete the day)

**File:** `tests/test_destination_coordinates.py`
- Test creating a destination with lat/lng
- Test updating lat/lng
- Test response includes lat/lng

### Task 4: Frontend — Geocoding Utility

**New file:** `frontend/lib/geocode-utils.ts`

```typescript
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null>
```

- Uses Nominatim API: `https://nominatim.openstreetmap.org/search`
- Includes `User-Agent` header (Nominatim TOS requirement)
- Returns `{ lat, lng }` or null on failure
- Graceful degradation: if geocoding fails, destination still saves without coordinates

### Task 5: Frontend — Types Update

**File:** `frontend/lib/types.ts`
```typescript
// Update TripDay (read model)
export interface TripDay {
  // ... existing fields
  destination_id?: number;
}

// Update TripDayCreate (write model) — needed by autoCreateDaysForDestination()
export interface TripDayCreate {
  // ... existing fields
  destination_id?: number;  // ← NEW
}

// Update Destination (read model)
export interface Destination {
  // ... existing fields
  latitude?: number;
  longitude?: number;
}

// Update DestinationFormData (write model) — needed by geocode PATCH
export interface DestinationFormData {
  // ... existing fields
  latitude?: number;   // ← NEW
  longitude?: number;  // ← NEW
}
```

> **Why both read + write models?** The geocoding PATCH (Task 6) calls `destinationApi.update(id, { latitude, longitude })`. If `DestinationFormData` doesn't have these fields, TypeScript will reject the call. Similarly, `autoCreateDaysForDestination()` (Task 9) needs `destination_id` on `TripDayCreate` to link days at creation time.

### Task 6: Frontend — Auto-Geocode Destinations on Save

**File:** `frontend/components/destinations/useDestinationForm.ts`

After POST/PUT of a destination:
1. Save the destination first (no blocking)
2. Background-geocode: `geocodeAddress("Paris, France")` → `{lat: 48.856, lng: 2.352}`
3. PATCH the destination with lat/lng via `destinationApi.update()`
4. Optionally show subtle confirmation in UI: `📍 Located: Paris, Île-de-France, France ✓`

Flow:
```
User saves destination → POST succeeds → geocodeAddress() → PATCH with lat/lng
                                ↑ user is not blocked here
```

### Task 6.5: Frontend — Geocode Home Base on Trip Creation

The Trip Wizard asks for "Departing from" (`home_base`) which is stored as freetext in the `TripContext` JSON. We should geocode it and store the coordinates so the Day Map can use them as a fallback map center.

**Why this matters for the Day Map (Phase 2):**
- Provides a sensible initial map viewport before any activities or destinations are geocoded
- Day 1 route context: the map can show `Home → Airport → Destination`
- Trip Overview Map (Phase 3) needs the origin point to draw the full journey

**Frontend type update:** `frontend/lib/trip-context.tsx`
```typescript
export interface TripContext {
  home_base?: string;
  home_base_latitude?: number;   // ← NEW
  home_base_longitude?: number;  // ← NEW
  // ... rest unchanged
}
```

**Frontend type update:** `frontend/lib/types.ts`
```typescript
// TripContext type (mirrors the above)
home_base_latitude?: number;
home_base_longitude?: number;
```

**File:** `frontend/components/trips/TripWizard.tsx`

In `handleSubmit()`, after the trip is created:
1. If `home_base` is non-empty, background-geocode: `geocodeAddress(data.home_base)`
2. PATCH the trip's `context` with `home_base_latitude` / `home_base_longitude`
3. Non-blocking — the user is already redirected to the trip page

Flow:
```
Wizard submit → POST trip → redirect to trip page
                         ↘ geocodeAddress(home_base) → PATCH trip context with lat/lng
                           (background, non-blocking)
```

> **Note:** Also applies to `TripSettings.tsx` where `home_base` can be edited after trip creation — update the geocode on save there too.

### Task 7: Frontend — Destination Picker on Day

**New file:** `frontend/components/days/DestinationPicker.tsx`

A dropdown that appears in the DayHeader or DayForm:
- Lists existing destinations for this trip
- "Create New Destination…" option at bottom → opens inline mini-form (name + country)
- On select → PATCH the day's `destination_id`
- Auto-updates `day.location` text from `destination.name` (unless user has a custom override)

### Task 8: Frontend — Integrate Picker into DayHeader + DayForm

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

### Task 8.5: Transport Coordinates + Smart Pre-fill

Now that destinations and days have coordinates, transport can benefit from the same pattern. This enables drawing transport routes on the map (Phase 2/3) and reduces manual data entry.

#### 8.5a: Backend — Add Coordinates to TripTransport

**File:** `app/models/trip_transport.py`
```python
origin_latitude = Column(Float, nullable=True)
origin_longitude = Column(Float, nullable=True)
destination_latitude = Column(Float, nullable=True)
destination_longitude = Column(Float, nullable=True)
```

**File:** `app/schemas/trip_transport.py`
- Add `origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude` (all `float | None = None`) to `TripTransportBase`, `TripTransportUpdate`, and `TripTransportRead`

**Migration:** `migrations/add_coordinates_to_transports.py`
- `ALTER TABLE trip_transports ADD COLUMN origin_latitude FLOAT`
- `ALTER TABLE trip_transports ADD COLUMN origin_longitude FLOAT`
- `ALTER TABLE trip_transports ADD COLUMN destination_latitude FLOAT`
- `ALTER TABLE trip_transports ADD COLUMN destination_longitude FLOAT`

**File:** `app/core/migrations.py`
- Register 4 new columns in the transport columns list

#### 8.5b: Frontend — Types Update

**File:** `frontend/lib/types.ts`
```typescript
// Update TripTransport + TripTransportCreate
export interface TripTransport {
  // ... existing fields
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
}
```

#### 8.5c: Frontend — Auto-Geocode Transport on Save

**File:** `frontend/components/transport/useTransport.ts`

Same background-geocode pattern as destinations (Task 6):
```
User saves transport → POST succeeds
  → geocodeAddress(origin) → PATCH with origin_latitude/longitude
  → geocodeAddress(destination) → PATCH with destination_latitude/longitude
  (both non-blocking)
```

**Skip geocoding when coordinates are already known** (see 8.5d below).

#### 8.5d: Frontend — Smart Pre-fill from Linked Day Destination

**File:** `frontend/components/transport/TransportForm.tsx`

When the user selects a **departure day** that has a linked destination (from Task 2):
1. Pre-fill the `origin` text field with the destination's name
2. Copy `destination.latitude/longitude` into `origin_latitude/longitude` — **skips redundant geocoding**
3. Same logic for **arrival day** → pre-fill `destination` text field

```typescript
// When departure day changes:
const depDay = tripDays.find(d => d.id === depDayId);
if (depDay?.destination_id && destinations) {
  const dest = destinations.find(d => d.id === depDay.destination_id);
  if (dest) {
    setOrigin(dest.name + (dest.country ? `, ${dest.country}` : ''));
    // Coordinates already known — no geocoding needed
    setOriginCoords({ lat: dest.latitude, lng: dest.longitude });
  }
}
```

**UX notes:**
- Pre-fill is a **suggestion**, not a lock — user can override (e.g., change "Paris" to "CDG Airport")
- If user edits the pre-filled text, clear the copied coordinates and trigger geocoding on save instead
- Show a subtle hint: `📍 Auto-filled from Day 3 — Paris, France`

#### 8.5e: Backend Tests

**File:** `tests/test_transport_coordinates.py`
- Test creating transport with origin/destination lat/lng
- Test updating coordinates
- Test response includes all 4 coordinate fields

#### What this enables for the Day Map (Phase 2) and Trip Overview Map (Phase 3)

| Map Feature | How Transport Coordinates Help |
|---|---|
| **Transport route on Day Map** | Draw a line from `origin_lat/lng` to `destination_lat/lng` on the day's map |
| **Flight arcs on Trip Overview Map** | Great-circle arcs between transport origin/destination pins |
| **Drive routes** | Polyline between coordinates (straight-line initially, routing API later) |
| **Animated trip timeline** | Slide through days showing movement between geocoded points |

> **Not in scope (future):** Auto-calculating `distance_km` from coordinates. Haversine gives straight-line distance which is misleading for drives. A routing API (OSRM, Google Directions) would be needed for road distance. Keep the existing manual `extra.distance_km` field for now.

### Task 9: Frontend — Shared Auto-Create Days Utility

**New file:** `frontend/lib/destination-day-utils.ts`

Extract the auto-create-days logic into a **reusable function** so it can be called from both the DestinationForm (Task 9a) and the TripWizard (Task 9.5).

```typescript
export interface AutoCreateDaysParams {
  tripId: number;
  destinationId: number;
  destinationName: string;
  arrivalDate: string;   // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
}

/**
 * Creates one TripDay per date in [arrivalDate, departureDate],
 * each linked to the given destination.
 * Returns the created TripDay records.
 */
export async function autoCreateDaysForDestination(
  params: AutoCreateDaysParams
): Promise<TripDay[]>
```

- Generates one `TripDayCreate` per date in range:
  - `destination_id` = destination id
  - `location` = destination name
  - `title` = `""` (user fills in later)
  - `day_number` = sequential from existing day count + 1
- POSTs each day via the existing `dayApi.createDay()`
- Returns array of created days

**Idempotency — handling `UniqueConstraint("trip_id", "date")`:**

The `trip_days` table has a unique constraint on `(trip_id, date)`. The utility must not crash if days already exist for some dates:
1. **Fetch existing days first:** Call `tripApi.getDays(tripId)` to get all current days
2. **Build a `Set<string>` of existing dates** (ISO format)
3. **Skip any date already in the set** — only POST days for new dates
4. **For existing days missing `destination_id`:** optionally PATCH them to link the destination

```typescript
const existingDays = await tripApi.getDays(tripId);
const existingDates = new Set(existingDays.data.map(d => d.date));

for (const date of dateRange) {
  if (existingDates.has(date)) {
    // Day exists — optionally PATCH to link destination if unlinked
    const existing = existingDays.data.find(d => d.date === date);
    if (existing && !existing.destination_id) {
      await dayApi.updateDay(existing.id, { destination_id: destinationId });
    }
    continue;
  }
  await dayApi.createDay({ trip_id: tripId, date, destination_id: destinationId, location: destinationName });
}
```

### Task 9a: Frontend — Wire Auto-Create into DestinationForm

**Where:** `DestinationForm.tsx` or `useDestinationForm.ts`

When saving a destination with `arrival_date` → `departure_date`:
- Show a prompt: "Create itinerary days for {name} ({arrival} – {departure})?"
- If accepted, call `autoCreateDaysForDestination()` from Task 9
- This is the **general-purpose** flow for destinations added after trip creation

### Task 9.5: Frontend — First Destination in Trip Wizard

Add a "First destination" field to the wizard's Step 1, so the user's trip is ready to go on creation.

**File:** `frontend/components/trips/TripWizard.tsx`

**Step 1 UI update:**
```
┌─────────────────────────────────────────────────┐
│  Step 1: The Basics                             │
│                                                 │
│  Trip name:         [European Summer 2026     ] │
│  Start / End:       [2026-07-01]   [2026-07-21] │
│  Timezone:          [Europe/Paris            ]  │
│  Departing from:    [Sydney, Australia       ]  │  ← home_base (existing)
│  First destination: [Paris, France           ]  │  ← NEW (optional)
│  Description:       [What's this trip...     ]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Wizard data additions:**
```typescript
interface WizardData {
  // ... existing fields
  first_destination: string;  // e.g. "Paris, France" — optional
}
```

**`onSubmit` callback change:**

Currently, the wizard calls `onSubmit(data)` and the **parent** component (`trips/page.tsx`) does the actual `tripApi.create()` POST. The wizard never sees the created trip's `id`. To support the destination/geocoding flow, the `onSubmit` signature must change:

```typescript
// BEFORE
onSubmit: (data: WizardSubmitData) => void;

// AFTER — returns the created trip so the wizard can do follow-up work
onSubmit: (data: WizardSubmitData) => Promise<Trip>;
```

**Updated `handleSubmit` flow:**

```typescript
const handleSubmit = async () => {
  // 1. Parent creates the trip and returns it
  const trip = await onSubmit(buildSubmitData());

  // 2–3 run in background (non-blocking) — don't await
  backgroundSetup(trip);
};

async function backgroundSetup(trip: Trip) {
  // 2. First destination (if provided)
  if (data.first_destination.trim()) {
    const dest = await destinationApi.create({
      trip_id: trip.id,
      name: data.first_destination,
      arrival_date: data.start_date,
      departure_date: data.end_date,
    });
    // Geocode + link days in parallel
    geocodeAddress(data.first_destination).then(coords => {
      if (coords) destinationApi.update(dest.data.id, coords);
    });
    autoCreateDaysForDestination({
      tripId: trip.id,
      destinationId: dest.data.id,
      destinationName: data.first_destination,
      arrivalDate: data.start_date,
      departureDate: data.end_date,
    });
  }

  // 3. Home base geocoding (if provided)
  if (data.home_base.trim()) {
    geocodeAddress(data.home_base).then(coords => {
      if (coords) {
        tripApi.update(trip.id, {
          context: { ...trip.context, home_base_latitude: coords.lat, home_base_longitude: coords.lng },
        });
      }
    });
  }
}
```

**Parent component change (`trips/page.tsx`):**
```typescript
// BEFORE
const handleWizardSubmit = (data) => { tripApi.create(data); router.push(...); };

// AFTER — return the created trip, let wizard do follow-up
const handleWizardSubmit = async (data) => {
  const response = await tripApi.create(data);
  router.push(`/trips/${response.data.id}`);
  return response.data; // ← wizard uses this for destination/geocoding
};
```

**Key behaviours:**
- `first_destination` is **optional** — user can skip it and add destinations later
- If provided, uses the **full trip date range** (`start_date` → `end_date`) as the destination's `arrival_date` / `departure_date` (sensible default for single-destination trips)
- For multi-city trips, the user refines dates later via the Destinations tab
- Steps 2 and 3 are **non-blocking** — the redirect happens immediately, geocoding and day creation happen in the background via `backgroundSetup()`
- Reuses `autoCreateDaysForDestination()` from Task 9 — **single source of truth**

**What the user lands on after the wizard:**
```
✅ Trip created (immediate)
✅ First destination with coordinates (background — ready within seconds)
✅ Days auto-created, each linked to the destination (background)
✅ Home base geocoded (background)
→ User can immediately start adding activities to their days
```

### Task 10: Smoke Test
- Create a trip via wizard with first destination → verify destination created with lat/lng
- Verify days auto-created and linked to that destination
- Create a trip via wizard without first destination → verify no destination or days created
- Create a destination via Destinations tab with dates → verify days auto-created (Task 9a)
- Open a day → pick a destination → verify it links
- Delete a destination → verify day still exists with `destination_id = NULL`
- Create a destination with a known city name → verify geocoding populated coordinates

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `migrations/add_coordinates_to_destinations.py` | Migration: lat/lng on destinations |
| `migrations/add_destination_id_to_trip_days.py` | Migration: FK on trip_days |
| `migrations/add_coordinates_to_transports.py` | Migration: origin/dest lat/lng on trip_transports |
| `tests/test_trip_day_destination.py` | Backend tests for day-destination link |
| `tests/test_destination_coordinates.py` | Backend tests for destination lat/lng |
| `tests/test_transport_coordinates.py` | Backend tests for transport lat/lng |
| `frontend/lib/geocode-utils.ts` | Nominatim geocoding utility |
| `frontend/lib/destination-day-utils.ts` | Shared auto-create-days-for-destination utility |
| `frontend/components/days/DestinationPicker.tsx` | Dropdown + inline create |
| `tests/test_home_base_geocode.py` | Test home_base lat/lng in trip context |

### Modified Files
| File | Changes |
|---|---|
| `app/models/destination.py` | Add `latitude`, `longitude` |
| `app/models/trip_day.py` | Add `destination_id` FK + relationship |
| `app/models/trip_transport.py` | Add `origin_latitude`, `origin_longitude`, `destination_latitude`, `destination_longitude` |
| `app/schemas/destination.py` | Add `latitude`, `longitude` |
| `app/schemas/trip_day.py` | Add `destination_id` |
| `app/schemas/trip_transport.py` | Add 4 coordinate fields to Base, Update, Read |
| `app/core/migrations.py` | Register new columns for destinations, trip_days, and trip_transports |
| `frontend/lib/types.ts` | Add `destination_id` to `TripDayCreate`, lat/lng to `Destination` + `DestinationFormData` + `TripTransport`, `home_base_latitude`/`home_base_longitude` |
| `frontend/lib/trip-context.tsx` | Add `home_base_latitude`, `home_base_longitude` to `TripContext` interface |
| `frontend/components/destinations/useDestinationForm.ts` | Auto-geocode on save |
| `frontend/components/days/DayHeader.tsx` | Show destination + picker |
| `frontend/components/days/DayForm.tsx` | Destination picker field |
| `frontend/components/days/DayBuilder.tsx` | Handle destination change |
| `frontend/components/destinations/DestinationForm.tsx` | Auto-create days prompt (calls shared utility) |
| `frontend/components/transport/TransportForm.tsx` | Smart pre-fill origin/dest from linked day destination |
| `frontend/components/transport/useTransport.ts` | Auto-geocode transport origin/dest on save |
| `frontend/components/trips/TripWizard.tsx` | First destination field + geocode home_base + auto-create days + `onSubmit` returns `Promise<Trip>` |
| `frontend/components/trips/TripSettings.tsx` | Re-geocode home_base on edit |
| `frontend/app/trips/page.tsx` | Update `handleWizardSubmit` to return created `Trip` for wizard follow-up |

---

## Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Simple FK not junction table | 90% of days are at one destination; transport handles "between" semantics |
| 2 | Bi-directional auto-creation | User can start from either Destinations tab or Days tab |
| 3 | `ON DELETE SET NULL` | Deleting a destination shouldn't delete your day plans |
| 4 | Store lat/lng on Destination now (Phase 1) | A destination is a place on a map — geocode at creation so coordinates are ready for Phase 2 |
| 5 | Geocode after save, not blocking | User isn't blocked; graceful degradation if Nominatim fails |
| 6 | Nominatim for geocoding | Free, no API key, sufficient accuracy for city-level destinations |
| 7 | Old "stops" → covered by Destinations | Transport redesign removed journeys/stops; destinations are the "places" |
| 8 | Store home_base lat/lng in TripContext JSON | No migration needed — context is already a JSON blob; coordinates provide Day Map fallback center |
| 9 | Extract auto-create-days into shared utility | Both DestinationForm and TripWizard need the same logic — single source of truth |
| 10 | First destination optional in wizard | Don't force it — some users plan iteratively and don't know their destination yet |
| 11 | Use full trip date range as default destination dates | Sensible default for single-city trips; user refines later for multi-city |
| 12 | `onSubmit` returns `Promise<Trip>` | Wizard needs the created trip's `id` for destination/geocoding follow-up; parent still owns the API call and redirect |
| 13 | Coordinates on Transport, not FK to Destination | Transport origin/dest are freeform (airports, stations, addresses) — too rigid for a FK. Coordinates give the map what it needs. |
| 14 | Smart pre-fill is a suggestion, not a lock | User can override pre-filled origin/dest text; if edited, clear copied coords and geocode on save |
