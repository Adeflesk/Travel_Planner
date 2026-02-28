# Implementation Plan: Day Map with Leaflet

**Date:** 2026-02-28  
**Status:** Draft  
**Depends on:** [Destination ↔ Day Link](./2026-02-28-destination-day-link.md)

---

## Context

Add an interactive map to the DayBuilder page showing activity locations as pins with a route polyline connecting them in time order. Uses Leaflet.js (free, lightweight, OpenStreetMap tiles) with Nominatim geocoding (free, no API key).

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

### Task 1: Backend — Add Coordinate Columns

**Models to update:**

| Model | New Columns |
|---|---|
| `Destination` | `latitude Float nullable`, `longitude Float nullable` |
| `DayActivity` | `latitude Float nullable`, `longitude Float nullable` |
| `TripDay`     | `latitude Float nullable`, `longitude Float nullable` |

**Migration:** `migrations/add_coordinates.py`
- Add 6 columns across 3 tables
- No backfill needed (all null initially; geocoded on save going forward)

**Schema updates:**
- Add `latitude: Optional[float] = None`, `longitude: Optional[float] = None` to all relevant Base/Create/Update/Response schemas in:
  - `app/schemas/destination.py`
  - `app/schemas/day_activity.py`
  - `app/schemas/trip_day.py`

**File:** `app/core/migrations.py`
- Register `latitude`, `longitude` in column lists for all 3 tables

### Task 2: Install Frontend Dependencies

```bash
cd frontend && npm install leaflet react-leaflet @types/leaflet
```

### Task 3: Frontend Types Update

**File:** `frontend/lib/types.ts`
- Add `latitude?: number`, `longitude?: number` to `TripDay`, `DayActivity`, and `Destination` interfaces

### Task 4: Geocoding Utilities

**New file:** `frontend/lib/geocode-utils.ts`

```typescript
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null>
```

- Uses Nominatim API: `https://nominatim.openstreetmap.org/search`
- Includes `User-Agent` header (Nominatim TOS requirement)
- Called after saving an entity with a location field
- Result stored in the backend (lat/lng columns) — no re-geocoding on each render

**New file:** `frontend/lib/useGeocode.ts`

```typescript
export function useGeocode(address: string | undefined): {
  result: { lat: number; lng: number; displayName: string } | null;
  loading: boolean;
  error: string | null;
}
```

- React hook wrapper for reactive geocoding
- Debounced (1000ms) to respect Nominatim rate limits (1 req/sec)
- Caches results in a `Map<string, GeocodeResult>` ref

### Task 5: Map Components

**Directory:** `frontend/components/map/`

#### `DayMap.tsx` — Main Day Map Component
- Renders a Leaflet map showing:
  - Day's main location pin (from `TripDay.latitude/longitude`)
  - Activity pins (from `DayActivity.latitude/longitude`)
  - Route polyline connecting activities in time order
- Custom markers: numbered circles matching activity order
- Popup on click: activity title, time, category
- Auto-fits bounds to show all pins
- **Must be dynamically imported** (Leaflet uses `window`/`document`):
  ```tsx
  const DayMap = dynamic(() => import('@/components/map/DayMap'), { ssr: false });
  ```

#### `MapMarker.tsx` — Custom Styled Markers
- Day location: large pin with destination name
- Activity: numbered circle (1, 2, 3...) with category-based color

#### `RoutePolyline.tsx` — Activity Route Lines
- Dashed polyline connecting consecutive activities
- Color-coded by time gap (tight = red, relaxed = green)

#### `index.ts` — Barrel export

#### Leaflet CSS
- Import `leaflet/dist/leaflet.css` in the map components
- Custom marker styles via a small `map.css` file

### Task 6: Integrate Map into DayBuilder

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

### Task 7: Geocode-on-Save

**Files:** `ActivityForm.tsx`, `DestinationForm.tsx`, `DayForm.tsx`

Geocoding flow:
```
User types location in form
         ↓
    Form saves entity (POST/PUT)
         ↓
    Client calls geocodeAddress(location)
         ↓
    If result found → PATCH entity with lat/lng
         ↓
    DayMap re-renders with new pin
```

Best practice: geocode **after save**, not during form editing. Avoids hammering Nominatim with every keystroke.

### Task 8: Map Styling + Polish
- Custom tile layer styling
- Responsive map height
- Loading skeleton while map initializes
- "No locations geocoded yet" empty state

### Task 9: Manual Testing
- Create activities with locations → verify pins appear
- Verify route polyline draws in time order
- Test map on mobile viewport
- Test with 0 geocoded activities (empty state)
- Test with 10+ activities (bounds fitting)

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `migrations/add_coordinates.py` | Migration: lat/lng columns |
| `frontend/lib/useGeocode.ts` | Nominatim geocoding hook |
| `frontend/lib/geocode-utils.ts` | Geocode-on-save utility |
| `frontend/components/map/DayMap.tsx` | Leaflet day map |
| `frontend/components/map/MapMarker.tsx` | Custom markers |
| `frontend/components/map/RoutePolyline.tsx` | Activity route lines |
| `frontend/components/map/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|---|---|
| `app/models/destination.py` | Add `latitude`, `longitude` |
| `app/models/day_activity.py` | Add `latitude`, `longitude` |
| `app/models/trip_day.py` | Add `latitude`, `longitude` |
| `app/schemas/destination.py` | Add `latitude`, `longitude` |
| `app/schemas/day_activity.py` | Add `latitude`, `longitude` |
| `app/schemas/trip_day.py` | Add `latitude`, `longitude` |
| `app/core/migrations.py` | Register new columns |
| `frontend/lib/types.ts` | Add `latitude`, `longitude` to types |
| `frontend/components/days/DayBuilder.tsx` | Map panel integration |
| `frontend/components/days/ActivityForm.tsx` | Geocode on save |
| `frontend/components/destinations/DestinationForm.tsx` | Geocode on save |
| `frontend/package.json` | Add leaflet, react-leaflet, @types/leaflet |

---

## Decisions Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Leaflet.js + react-leaflet | Free, lightweight (~44kb), OSS, no API key |
| 2 | OpenStreetMap tiles | Free, no billing, good global coverage |
| 3 | Nominatim for geocoding | Free, no API key, sufficient accuracy for travel planning |
| 4 | Store lat/lng on backend | Best practice — fast map loads, no re-geocoding every render |
| 5 | Geocode after save | Respects Nominatim rate limits (1 req/sec) |
| 6 | Dynamic import for map | Leaflet uses `window`/`document` — incompatible with Next.js SSR |
| 7 | Collapsible map panel | Don't force map on users who don't need it; save viewport space on mobile |

---

## Future: Trip Overview Map (Phase 3)

Once the Day Map is working, a natural next step is a full **Trip Overview Map**:
- All destinations as major markers
- Transport routes drawn between destinations (flight arcs, road polylines)
- Day-by-day animation slider
- New tab on the trip detail page

This is out of scope for this plan but builds directly on the components created here.
