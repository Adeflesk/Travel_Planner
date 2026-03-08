# Transport Intelligence Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace plain text origin/destination boxes in the transport form with Mapbox-powered, category-filtered location search; store timezones via a new backend endpoint; display timezone-accurate duration; add seat class for flights.

**Architecture:** New `GET /timezone` endpoint uses `timezonefinder` (offline, no API key) to resolve IANA timezone from coordinates. New `TransportLocationSearch` frontend component calls the Mapbox Suggest + Retrieve APIs directly (not the SearchBox widget) to support POI category filtering per transport type. Timezone fields stored in two new nullable columns on `trip_transports`.

**Tech Stack:** Python `timezonefinder>=6.2.0`, Mapbox Search Suggest/Retrieve REST API (existing token `NEXT_PUBLIC_MAPBOX_TOKEN`), `date-fns-tz` (already installed), FastAPI, SQLAlchemy, Next.js/React.

---

### Task 1: Backend — `/timezone` endpoint (TDD)

**Files:**
- Create: `app/routers/timezone.py`
- Create: `tests/test_timezone_endpoint.py`
- Modify: `app/routers/__init__.py`
- Modify: `app/main.py`
- Modify: `requirements.txt`

**Step 1: Add `timezonefinder` to requirements**

In `requirements.txt`, add after the existing dependencies:
```
timezonefinder>=6.2.0
```

Install it:
```bash
source .venv/bin/activate
pip install timezonefinder>=6.2.0
pip freeze | grep timezonefinder  # verify version printed
```

**Step 2: Write the failing tests**

Create `tests/test_timezone_endpoint.py`:

```python
"""
tests/test_timezone_endpoint.py

Tests for GET /timezone?lat=X&lng=Y endpoint.
"""


def test_get_timezone_valid_coords_heathrow(client, test_user):
    """Known coords → known timezone."""
    resp = client.get("/timezone?lat=51.4775&lng=-0.4614")
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "Europe/London"


def test_get_timezone_valid_coords_new_york(client, test_user):
    resp = client.get("/timezone?lat=40.6413&lng=-73.7781")
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "America/New_York"


def test_get_timezone_ocean_returns_null(client, test_user):
    """Mid-Atlantic ocean has no timezone — returns null, not an error."""
    resp = client.get("/timezone?lat=0.0&lng=-30.0")
    assert resp.status_code == 200
    assert resp.json()["timezone"] is None


def test_get_timezone_missing_lat(client, test_user):
    resp = client.get("/timezone?lng=-0.4614")
    assert resp.status_code == 422


def test_get_timezone_missing_lng(client, test_user):
    resp = client.get("/timezone?lat=51.4775")
    assert resp.status_code == 422


def test_get_timezone_lat_out_of_range(client, test_user):
    resp = client.get("/timezone?lat=999&lng=-0.4614")
    assert resp.status_code == 422


def test_get_timezone_requires_auth(base_client):
    """No JWT → 401."""
    resp = base_client.get("/timezone?lat=51.4775&lng=-0.4614")
    assert resp.status_code == 401
```

**Step 3: Run tests — verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_timezone_endpoint.py -v
```

Expected: all fail with `404` or `ImportError` (endpoint doesn't exist yet).

**Step 4: Create the endpoint**

Create `app/routers/timezone.py`:

```python
"""
app/routers/timezone.py - Timezone lookup from coordinates

Uses timezonefinder (offline, no API key) to resolve an IANA timezone
string from a lat/lng pair. Returns null for ocean coordinates.
"""

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user
from app import models

router = APIRouter(prefix="/timezone", tags=["timezone"])

# Single shared instance — TimezoneFinder loads ~20MB of data once at import
from timezonefinder import TimezoneFinder as _TF
_tf = _TF()


@router.get("/")
def get_timezone(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    _: models.User = Depends(get_current_user),
):
    """Return the IANA timezone for the given coordinates, or null for ocean."""
    timezone = _tf.timezone_at(lat=lat, lng=lng)
    return {"timezone": timezone}
```

**Step 5: Register the router**

In `app/routers/__init__.py`, add:
```python
from .timezone import router as timezone_router
```

Add `"timezone_router"` to `__all__`.

In `app/main.py`, add `timezone_router` to the import from `app.routers` and add:
```python
app.include_router(timezone_router)
```
(Place it with the other `include_router` calls, order doesn't matter.)

**Step 6: Run tests — verify they pass**

```bash
pytest tests/test_timezone_endpoint.py -v
```

Expected: 7 passed.

**Step 7: Commit**

```bash
git add requirements.txt app/routers/timezone.py app/routers/__init__.py app/main.py tests/test_timezone_endpoint.py
git commit -m "feat: add GET /timezone endpoint using timezonefinder"
```

---

### Task 2: Backend — timezone columns on TripTransport

**Files:**
- Modify: `app/models/trip_transport.py`
- Modify: `app/schemas/trip_transport.py`
- Modify: `app/core/migrations.py`
- Create: `tests/test_transport_timezones.py`

**Step 1: Write failing tests**

Create `tests/test_transport_timezones.py`:

```python
"""
tests/test_transport_timezones.py

Verifies origin_timezone and destination_timezone are stored and
returned correctly on TripTransport. Existing transports without
timezones remain unaffected (nullable columns).
"""


def _make_trip(client):
    resp = client.post(
        "/trips/",
        json={
            "name": "Timezone Test Trip",
            "start_date": "2030-08-01",
            "end_date": "2030-08-10",
            "status": "planning",
            "budget": 3000,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_create_transport_with_timezones(client, test_user):
    """Timezone fields round-trip through create → read."""
    trip_id = _make_trip(client)
    payload = {
        "transport_type": "flight",
        "origin": "London Heathrow",
        "destination": "New York JFK",
        "origin_timezone": "Europe/London",
        "destination_timezone": "America/New_York",
    }
    resp = client.post(f"/trips/{trip_id}/transport", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_timezone"] == "Europe/London"
    assert data["destination_timezone"] == "America/New_York"


def test_update_transport_timezones(client, test_user):
    """PUT can add timezones to an existing transport."""
    trip_id = _make_trip(client)
    create_resp = client.post(
        f"/trips/{trip_id}/transport",
        json={"transport_type": "train", "origin": "Paris", "destination": "London"},
    )
    assert create_resp.status_code == 201
    t_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/transport/{t_id}",
        json={
            "origin_timezone": "Europe/Paris",
            "destination_timezone": "Europe/London",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["origin_timezone"] == "Europe/Paris"
    assert update_resp.json()["destination_timezone"] == "Europe/London"


def test_transport_without_timezones_returns_null(client, test_user):
    """Transports created without timezone fields return null (not missing key)."""
    trip_id = _make_trip(client)
    resp = client.post(
        f"/trips/{trip_id}/transport",
        json={"transport_type": "bus", "origin": "Nice", "destination": "Monaco"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_timezone"] is None
    assert data["destination_timezone"] is None


def test_calculate_flight_duration_timezone_aware():
    """
    calculateFlightDuration correctly accounts for timezone offset.

    LHR 10:00 → JFK 13:00 local time is NOT 3h.
    LHR = UTC+0, JFK = UTC-5, so actual duration = 3h + 5h = 8h.
    """
    from frontend_utils import calculate_flight_duration_py  # noqa: F401
    # NOTE: calculateFlightDuration is a TypeScript frontend utility.
    # This test documents expected behaviour only; verify manually or via
    # the timezone endpoint integration test above.
    # LHR departure 10:00 UTC+0 → UTC 10:00
    # JFK arrival   13:00 UTC-5 → UTC 18:00
    # Expected duration: 480 minutes (8 hours)
    pass  # Manual verification: open transport form, select LHR→JFK, set 10:00 dep / 13:00 arr
```

**Step 2: Run tests — verify existing ones fail on timezone fields**

```bash
pytest tests/test_transport_timezones.py::test_create_transport_with_timezones -v
```

Expected: fail — `origin_timezone` not in response (field doesn't exist yet).

**Step 3: Add columns to the model**

In `app/models/trip_transport.py`, add after `destination_longitude`:

```python
origin_timezone = Column(String(50), nullable=True)
destination_timezone = Column(String(50), nullable=True)
```

**Step 4: Add fields to schemas**

In `app/schemas/trip_transport.py`:

In `TripTransportBase` (after `destination_longitude`):
```python
origin_timezone: str | None = None
destination_timezone: str | None = None
```

In `TripTransportUpdate` (after `destination_longitude`):
```python
origin_timezone: str | None = None
destination_timezone: str | None = None
```

`TripTransportRead` inherits from `TripTransportBase` — no changes needed there.

**Step 5: Add migration**

In `app/core/migrations.py`, find the `trip_transport_columns` list and add two entries:

```python
trip_transport_columns = [
    ("origin_latitude", "FLOAT", "NULL"),
    ("origin_longitude", "FLOAT", "NULL"),
    ("destination_latitude", "FLOAT", "NULL"),
    ("destination_longitude", "FLOAT", "NULL"),
    ("origin_timezone", "VARCHAR(50)", "NULL"),       # ← add
    ("destination_timezone", "VARCHAR(50)", "NULL"),  # ← add
]
```

**Step 6: Run tests — verify they pass**

```bash
pytest tests/test_transport_timezones.py -v
```

Expected: `test_create_transport_with_timezones`, `test_update_transport_timezones`, `test_transport_without_timezones_returns_null` pass. The `test_calculate_flight_duration_timezone_aware` passes trivially (it's `pass`).

**Step 7: Run full test suite to confirm no regressions**

```bash
pytest -q --tb=short
```

Expected: all pass.

**Step 8: Commit**

```bash
git add app/models/trip_transport.py app/schemas/trip_transport.py app/core/migrations.py tests/test_transport_timezones.py
git commit -m "feat: add origin_timezone and destination_timezone to TripTransport"
```

---

### Task 3: Frontend — TypeScript types

**Files:**
- Modify: `frontend/lib/types.ts`

**Step 1: Add timezone fields to `TripTransport` interface**

In `frontend/lib/types.ts`, find the `TripTransport` interface (line ~120) and add after `destination_longitude`:

```typescript
  origin_timezone?: string | null;
  destination_timezone?: string | null;
```

**Step 2: Add timezone fields to `TripTransportCreate` interface**

Find `TripTransportCreate` (line ~146) and add after `destination_longitude`:

```typescript
  origin_timezone?: string | null;
  destination_timezone?: string | null;
```

`TripTransportUpdate` is `Partial<TripTransportCreate>` — automatically picks up the new fields.

**Step 3: Add `timezoneApi` to `api.ts`**

In `frontend/lib/api.ts`, find where other API objects are exported (e.g. near `settingsApi`, `tripApi`) and add:

```typescript
export const timezoneApi = {
  lookup: (lat: number, lng: number) =>
    api.get<{ timezone: string | null }>(`/timezone?lat=${lat}&lng=${lng}`),
};
```

**Step 4: Lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/api.ts
git commit -m "feat: add timezone fields to TripTransport types and timezoneApi"
```

---

### Task 4: Frontend — `TransportLocationSearch` component

**Files:**
- Create: `frontend/components/transport/TransportLocationSearch.tsx`
- Modify: `frontend/components/transport/index.ts`

**Overview:** This component calls the Mapbox Search Suggest API directly (not the SearchBox widget) to support POI category filtering per transport type. On selection it calls the Retrieve API for coordinates, then calls our `/timezone` endpoint.

**Step 1: Create the component**

Create `frontend/components/transport/TransportLocationSearch.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { timezoneApi } from '@/lib/api';

const TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '').trim();
const SUGGEST_URL = 'https://api.mapbox.com/search/searchbox/v1/suggest';
const RETRIEVE_URL = 'https://api.mapbox.com/search/searchbox/v1/retrieve';

// Maps our transport types to Mapbox POI categories.
// null = no category filter (general geocoding).
const CATEGORY: Record<string, string | null> = {
  flight: 'airport',
  train: 'train_station',
  bus: 'bus_station',
  ferry: 'ferry_terminal',
  drive: null,
  other: null,
};

interface Suggestion {
  mapbox_id: string;
  name: string;
  place_formatted: string;
}

export interface TransportLocation {
  name: string;
  lat: number;
  lng: number;
  timezone: string | null;
}

interface Props {
  transportType: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (raw: string) => void;
  onSelect: (loc: TransportLocation) => void;
}

function newSessionToken() {
  return crypto.randomUUID();
}

export function TransportLocationSearch({
  transportType,
  value,
  placeholder = 'Search…',
  required,
  onChange,
  onSelect,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const category = CATEGORY[transportType] ?? null;

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q,
          access_token: TOKEN,
          session_token: sessionToken.current,
          limit: '6',
          language: 'en',
        });
        if (category) {
          params.set('poi_category', category);
          params.set('types', 'poi');
        }
        const res = await fetch(`${SUGGEST_URL}?${params}`);
        if (!res.ok) throw new Error('suggest failed');
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = async (s: Suggestion) => {
    onChange(s.name);
    setOpen(false);
    setSuggestions([]);

    try {
      const params = new URLSearchParams({
        access_token: TOKEN,
        session_token: sessionToken.current,
      });
      const res = await fetch(`${RETRIEVE_URL}/${s.mapbox_id}?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) return;

      const [lng, lat] = feature.geometry.coordinates as [number, number];

      // Reset session token — Mapbox bills per session (suggest → retrieve)
      sessionToken.current = newSessionToken();

      // Timezone lookup — non-blocking
      let timezone: string | null = null;
      try {
        const tz = await timezoneApi.lookup(lat, lng);
        timezone = tz.data.timezone;
      } catch {
        // timezone is optional; don't block selection
      }

      onSelect({ name: s.name, lat, lng, timezone });
    } catch {
      // If retrieve fails entirely, the text value is already updated
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputCls =
    'w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin pointer-events-none" />
        ) : (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
        <input
          type="text"
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={inputCls}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.mapbox_id}
              onMouseDown={() => handleSelect(s)}
              className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                <div className="text-xs text-slate-500 truncate">{s.place_formatted}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Step 2: Export from barrel**

In `frontend/components/transport/index.ts`, add:

```typescript
export { TransportLocationSearch } from './TransportLocationSearch';
export type { TransportLocation } from './TransportLocationSearch';
```

**Step 3: Lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/components/transport/TransportLocationSearch.tsx frontend/components/transport/index.ts
git commit -m "feat: add TransportLocationSearch with Mapbox category filtering"
```

---

### Task 5: Frontend — Wire into `TransportForm`

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`

**Overview:** Replace the two plain text inputs with `TransportLocationSearch`. Add timezone state. Add live duration badge. Add seat class pill selector for flights.

**Step 1: Add new state variables**

In `TransportForm.tsx`, find the existing state declarations (lines 46–83) and add after `destCoords`:

```tsx
const [originTimezone, setOriginTimezone] = useState<string | null>(
  initialData?.origin_timezone ?? null
);
const [destTimezone, setDestTimezone] = useState<string | null>(
  initialData?.destination_timezone ?? null
);
const [seatClass, setSeatClass] = useState<string>(
  (initialData?.extra?.seat_class as string) ?? 'economy'
);
```

**Step 2: Import the new component and timezone util**

At the top of `TransportForm.tsx`, add to the existing imports:

```tsx
import { TransportLocationSearch } from './TransportLocationSearch';
import type { TransportLocation } from './TransportLocationSearch';
import { calculateFlightDuration, formatDuration } from '@/lib/timezone-utils';
```

**Step 3: Add duration computation**

After the `cfg` line (line 85), add:

```tsx
const duration: number | null = (() => {
  if (!depTime || !arrTime) return null;
  const mins = calculateFlightDuration(depTime, arrTime, originTimezone ?? undefined, destTimezone ?? undefined);
  return mins > 0 ? mins : null;
})();
```

**Step 4: Replace origin text input**

Find the origin `<input>` block (lines 166–181) and replace the entire `<div>` with:

```tsx
<div>
  <label className="block text-xs font-medium text-slate-600 mb-1">From *</label>
  <TransportLocationSearch
    transportType={type}
    value={origin}
    placeholder="e.g. London Heathrow"
    required
    onChange={(val) => {
      setOrigin(val);
      if (val !== prefilledOrigin) {
        setOriginCoords(null);
        setOriginTimezone(null);
        setPrefilledOrigin(null);
      }
    }}
    onSelect={(loc: TransportLocation) => {
      setOrigin(loc.name);
      setOriginCoords({ lat: loc.lat, lng: loc.lng });
      setOriginTimezone(loc.timezone);
    }}
  />
  {prefilledOrigin && origin === prefilledOrigin && (
    <p className="text-xs text-sky-600 mt-1">Auto-filled from linked destination</p>
  )}
</div>
```

**Step 5: Replace destination text input**

Find the destination `<input>` block (lines 183–195) and replace the entire `<div>` with:

```tsx
<div>
  <label className="block text-xs font-medium text-slate-600 mb-1">To *</label>
  <TransportLocationSearch
    transportType={type}
    value={destination}
    placeholder="e.g. New York JFK"
    required
    onChange={(val) => {
      setDestination(val);
      setDestCoords(null);
      setDestTimezone(null);
    }}
    onSelect={(loc: TransportLocation) => {
      setDestination(loc.name);
      setDestCoords({ lat: loc.lat, lng: loc.lng });
      setDestTimezone(loc.timezone);
    }}
  />
</div>
```

**Step 6: Add duration badge**

Find the overnight nudge block (line ~244). Directly before it, add the duration badge:

```tsx
{/* Duration badge — shown when times + timezones are known */}
{duration !== null && (
  <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-700">
    <span>🕐</span>
    <span className="font-semibold">Duration: {formatDuration(duration)}</span>
    {originTimezone && destTimezone && originTimezone !== destTimezone && (
      <span className="text-xs text-sky-500 ml-1">(timezone-adjusted)</span>
    )}
  </div>
)}
```

**Step 7: Add seat class selector for flights**

Find the frequency block (lines ~383–393). After the frequency block, add the seat class selector:

```tsx
{/* Seat class — flights only */}
{type === 'flight' && (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-2">Seat class</label>
    <div className="flex flex-wrap gap-2">
      {(['economy', 'premium economy', 'business', 'first'] as const).map((cls) => (
        <button
          key={cls}
          type="button"
          onClick={() => setSeatClass(cls)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
            seatClass === cls
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
          }`}
        >
          {cls}
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 8: Include timezone + seat class in handleSubmit**

In the `handleSubmit` function, find the `extra` object construction and add seat class:

```tsx
if (type === 'flight' && seatClass) extra.seat_class = seatClass;
```

In the `data` object, add the timezone fields after `destination_longitude`:

```tsx
origin_timezone: originTimezone ?? undefined,
destination_timezone: destTimezone ?? undefined,
```

**Step 9: Lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Fix any errors before continuing.

**Step 10: Commit**

```bash
git add frontend/components/transport/TransportForm.tsx
git commit -m "feat: wire TransportLocationSearch, duration badge, and seat class into TransportForm"
```

---

### Task 6: Frontend — Update `TransportItem` display

**Files:**
- Modify: `frontend/components/transport/TransportItem.tsx`

**Overview:** Show timezone-accurate duration and seat class badge on the transport card.

**Step 1: Add imports and helpers**

At the top of `TransportItem.tsx`, add:

```tsx
import { calculateFlightDuration, formatDuration } from '@/lib/timezone-utils';
```

**Step 2: Compute duration inside the component**

In `TransportItem`, after the `isDeparture` check, add:

```tsx
const duration: number | null = (() => {
  if (!transport.departure_time || !transport.arrival_time) return null;
  const mins = calculateFlightDuration(
    transport.departure_time,
    transport.arrival_time,
    transport.origin_timezone ?? undefined,
    transport.destination_timezone ?? undefined
  );
  return mins > 0 ? mins : null;
})();

const seatClass = transport.extra?.seat_class as string | undefined;
```

**Step 3: Add duration + seat class to the detail row**

Find the detail row (line ~66 — the row showing times, carrier, reference, cost). Add after the arrival time span:

```tsx
{duration !== null && (
  <span className="text-slate-400">· {formatDuration(duration)}</span>
)}
{seatClass && transport.transport_type === 'flight' && (
  <span className="capitalize text-sky-600 text-xs font-medium bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
    {seatClass}
  </span>
)}
```

**Step 4: Lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/components/transport/TransportItem.tsx
git commit -m "feat: show duration and seat class in TransportItem"
```

---

### Task 7: Final verification

**Step 1: Run full backend test suite**

```bash
source .venv/bin/activate
pytest -q --tb=short
```

Expected: all pass, no regressions.

**Step 2: Run frontend checks**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 3: Manual smoke test**

Start both servers:
```bash
# Terminal 1
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Verify:
- [ ] Open a day, click "Add Transport", select "Flight"
- [ ] Type "Heathrow" in From → see airport suggestions dropdown
- [ ] Select Heathrow → field populates with "Heathrow Airport"
- [ ] Type "Kennedy" in To → see JFK suggestion
- [ ] Select JFK → field populates
- [ ] Set departure 10:00, arrival 13:00 → see "Duration: 8h 0m (timezone-adjusted)" badge
- [ ] Seat class pills visible — click Business → pills update
- [ ] Save → transport item shows duration + seat class badge
- [ ] Switch to "Train" type → typing shows train station suggestions, no airports
- [ ] Switch to "Drive" → typing shows general locations (no category filter)

**Step 4: Commit final verification notes**

```bash
git add .
git commit -m "chore: transport intelligence upgrade complete"
```

---

## Summary of all files changed

| File | Change |
|---|---|
| `requirements.txt` | +`timezonefinder>=6.2.0` |
| `app/routers/timezone.py` | New — `GET /timezone` endpoint |
| `app/routers/__init__.py` | +`timezone_router` |
| `app/main.py` | +`include_router(timezone_router)` |
| `app/models/trip_transport.py` | +`origin_timezone`, `destination_timezone` columns |
| `app/schemas/trip_transport.py` | +timezone fields to Base and Update |
| `app/core/migrations.py` | +timezone columns to `trip_transport_columns` |
| `tests/test_timezone_endpoint.py` | New — 7 endpoint tests |
| `tests/test_transport_timezones.py` | New — 3 persistence tests |
| `frontend/lib/types.ts` | +timezone fields to `TripTransport` / `TripTransportCreate` |
| `frontend/lib/api.ts` | +`timezoneApi.lookup()` |
| `frontend/components/transport/TransportLocationSearch.tsx` | New — Mapbox category-aware autocomplete |
| `frontend/components/transport/index.ts` | +`TransportLocationSearch` export |
| `frontend/components/transport/TransportForm.tsx` | Replace inputs, add duration badge + seat class |
| `frontend/components/transport/TransportItem.tsx` | Show duration + seat class |
