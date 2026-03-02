# Implementation Plan: Day Map with Leaflet

**Date:** 2026-02-28  
**Status:** Revised 2026-02-28
**Depends on:** [Destination ↔ Day Link](./2026-02-28-destination-day-link.md) (which adds lat/lng to destinations and builds `geocode-utils.ts`)

---

## Context

Add an interactive map to the DayBuilder page showing activity locations as pins with a route polyline connecting them in time order. Uses Leaflet.js (free, lightweight, OpenStreetMap tiles) with Nominatim geocoding (already built in Phase 1).

### What Phase 1 Already Provides
- ✅ `latitude`/`longitude` columns on `Destination` model
- ✅ `geocodeAddress()` utility in `frontend/lib/geocode-utils.ts`
- ✅ Nominatim integration with rate-limiting and graceful degradation
- ✅ `home_base_latitude`/`home_base_longitude` in `TripContext` JSON (geocoded from the wizard's "Departing from" field)
- ✅ `origin_latitude`/`longitude` + `destination_latitude`/`longitude` on `TripTransport` (geocoded on save, or copied from linked day destination)

### What This Plan Adds
- lat/lng columns on `DayActivity` only (day-level coordinates come from the linked `Destination` via Phase 1's `destination_id` FK — no separate `TripDay.lat/lng` needed)
- Leaflet map component rendered on the DayBuilder page
- Auto-geocoding for activity locations on save

### Library Choice: Leaflet.js + react-leaflet

| Library | Cost | Bundle | OSS | Verdict |
|---|---|---|---|---|
| **Leaflet + react-leaflet** | 🟢 Free | 🟢 ~44kb | 🟢 Yes | ✅ **Chosen** |
| Mapbox GL JS | ⚠️ Paid after 50k/mo | ⚠️ ~230kb | 🔴 No | Overkill |
| MapLibre GL JS | 🟢 Free | ⚠️ ~200kb | 🟢 Yes | Runner-up |
| Google Maps | 🔴 Expensive | ⚠️ ~150kb | 🔴 No | ❌ |

**Why Leaflet wins:** Zero cost (OpenStreetMap tiles), tiny bundle, perfect for markers + polylines + popups, excellent React hooks support via `react-leaflet` v4.

---

## Tasks

### Task 1: Backend — Add Coordinates to DayActivity

`TripDay` coordinates are intentionally omitted — the linked `Destination` (Phase 1) already provides map center coordinates via `destination_id`. `DayActivity` needs its own lat/lng for pinning individual activities.

**Model to update:** `app/models/day_activity.py`

```python
latitude = Column(Float, nullable=True)
longitude = Column(Float, nullable=True)
```

**Migration:** `migrations/add_coordinates_to_activities.py`
```sql
ALTER TABLE day_activities ADD COLUMN latitude FLOAT;
ALTER TABLE day_activities ADD COLUMN longitude FLOAT;
```
No backfill needed (null initially; geocoded on save going forward).

**Schema updates** — `app/schemas/day_activity.py`:
- Add `latitude: float | None = None`, `longitude: float | None = None` to `DayActivityBase`, `DayActivityUpdate`, `DayActivityResponse`

**File:** `app/core/migrations.py`
- Register `latitude`, `longitude` in the `day_activity_columns` list

### Task 2: Install Frontend Dependencies

```bash
cd frontend && npm install leaflet react-leaflet @types/leaflet
```

### Task 3: Frontend — Types Update

**File:** `frontend/lib/types.ts`
- Add `latitude?: number`, `longitude?: number` to `DayActivity` interface only
- `TripDay` does not need these fields — map uses destination coordinates via `destination_id`

### Task 4: Frontend — Geocoding Hook (for reactive use in map)

**New file:** `frontend/lib/useGeocode.ts`

```typescript
export function useGeocode(address: string | undefined): {
  result: { lat: number; lng: number; displayName: string } | null;
  loading: boolean;
  error: string | null;
}
```

- React hook wrapper around `geocodeAddress()` from Phase 1
- Caches results in a module-level `Map<string, GeocodeResult>` (shared across hook instances)
- **Rate-limit safety:** uses a module-level request queue that spaces Nominatim calls 1100ms apart — prevents parallel hook instances (one per activity) from hammering the API simultaneously
- Used by the map as a fallback for activities that have a `location` string but no stored `latitude`/`longitude` yet (i.e., activities created before geocoding was added)

### Task 5: Frontend — Map Components

**Directory:** `frontend/components/map/`

#### `DayMap.tsx` — Main Day Map Component

Markers and polylines are rendered as JSX directly inside `<MapContainer>` — no separate `MapMarker.tsx` or `RoutePolyline.tsx` files needed.

Props:
```typescript
interface DayMapProps {
  day: TripDay;
  destinations: Destination[];   // already loaded by DayBuilder (from picker work)
  activities: DayActivity[];
  transports: TripTransport[];
  tripContext?: TripContext;      // for home_base fallback center
}
```

Renders:
- **Destination pin** — from `destinations.find(d => d.id === day.destination_id)?.latitude/longitude`; large named marker
- **Activity pins** — from `DayActivity.latitude/longitude`; numbered circles in time order. Falls back to `useGeocode(activity.location)` if coords not yet stored
- **Route polyline** — dashed line connecting activities in chronological order
- **Transport routes** — dashed lines from `TripTransport.origin_latitude/longitude` → `destination_latitude/longitude` for transports on this day
- **Popup on click** — activity title, time, category

Auto-fits bounds to all pins. **Fallback center priority:**
1. Linked destination coordinates
2. `TripContext.home_base_latitude` / `home_base_longitude`
3. World-level view

**Must be dynamically imported** (Leaflet uses `window`/`document`):
```tsx
const DayMap = dynamic(() => import('@/components/map/DayMap'), { ssr: false });
```

#### `index.ts` — Barrel export

#### Leaflet CSS
- Import `leaflet/dist/leaflet.css` in `DayMap.tsx`
- Override default marker icons (Leaflet's default icon path breaks in Next.js — use `L.divIcon` for custom markers instead)

### Task 6: Frontend — Integrate Map into DayBuilder

**File:** `frontend/components/days/DayBuilder.tsx`

Add a collapsible map panel above the timeline:

```
┌─────────────────────────────────────┐
│  DayHeader  (date, destination)     │
├─────────────────────────────────────┤
│  📍 Day Map           [Expand ▾]   │
│  ┌─────────────────────────────┐    │
│  │    🗺️ Leaflet Map          │    │
│  │    1 → 2 → 3 (route)       │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Timeline                           │
│  09:00  ① Croissant Breakfast      │
│  11:00  ② Louvre Museum            │
│  14:00  ③ Seine River Walk         │
└─────────────────────────────────────┘
```

- Click a marker → highlight corresponding activity in timeline
- Click a timeline item → pan map to that marker
- Map collapsed by default, toggle to expand (remembers preference in localStorage)

### Task 7: Frontend — Geocode Activities + Days on Save

**Files:** `ActivityForm.tsx`, `DayForm.tsx`

Uses `geocodeAddress()` from Phase 1 (already built). Same pattern as destination geocoding:

```
User saves activity with location → POST succeeds → geocodeAddress() → PATCH with lat/lng
```

### Task 8: Map Styling + Polish
- Custom tile layer styling
- Responsive map height
- Loading skeleton while map initializes
- "No locations geocoded yet" empty state — if `home_base` coordinates exist, still show the map centered on departure city with a subtle home marker and a prompt: _"Add locations to your activities to see them on the map"_
- If no coordinates at all (no home_base, no activities), show an illustrated empty state

### Task 9: Manual Testing
- Create activities with locations → verify pins appear
- Verify route polyline draws in time order
- Test map on mobile viewport
- Test with 0 geocoded activities (empty state)
- Test with 10+ activities (bounds fitting)
- Verify destination pin appears from Phase 1 coordinates

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `migrations/add_coordinates_to_activities_and_days.py` | Migration: lat/lng for DayActivity + TripDay |
| `frontend/lib/useGeocode.ts` | Reactive geocoding hook for map |
| `frontend/components/map/DayMap.tsx` | Leaflet day map |
| `frontend/components/map/MapMarker.tsx` | Custom markers |
| `frontend/components/map/RoutePolyline.tsx` | Activity route lines |
| `frontend/components/map/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|---|---|
| `app/models/day_activity.py` | Add `latitude`, `longitude` |
| `app/models/trip_day.py` | Add `latitude`, `longitude` |
| `app/schemas/day_activity.py` | Add `latitude`, `longitude` |
| `app/schemas/trip_day.py` | Add `latitude`, `longitude` |
| `app/core/migrations.py` | Register new columns |
| `frontend/lib/types.ts` | Add `latitude`, `longitude` to DayActivity + TripDay |
| `frontend/components/days/DayBuilder.tsx` | Map panel integration |
| `frontend/components/days/ActivityForm.tsx` | Geocode on save |
| `frontend/components/days/DayForm.tsx` | Geocode on save |
| `frontend/package.json` | Add leaflet, react-leaflet, @types/leaflet |

---

## Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Leaflet.js + react-leaflet | Free, lightweight (~44kb), OSS, no API key |
| 2 | OpenStreetMap tiles | Free, no billing, good global coverage |
| 3 | Reuse `geocodeAddress()` from Phase 1 | Already built for destinations; same utility works for activities |
| 4 | Add `useGeocode` hook for reactive fallback | Map can geocode on-the-fly for activities missing stored coordinates |
| 5 | Store lat/lng on backend | Best practice — fast map loads, no re-geocoding every render |
| 6 | Dynamic import for map | Leaflet uses `window`/`document` — incompatible with Next.js SSR |
| 7 | Collapsible map panel | Don't force map on users who don't need it; save viewport space on mobile |

---

## Future: Trip Overview Map (Phase 3)

Once the Day Map is working, a natural next step is a full **Trip Overview Map**:
- All destinations as major markers (coordinates from Phase 1)
- Transport routes drawn between destinations (flight arcs, road polylines)
- Day-by-day animation slider
- New tab on the trip detail page

This is out of scope for this plan but builds directly on the components created here.
