# Transport Intelligence Upgrade — Design

**Date:** 2026-03-08
**Status:** Approved
**Branch:** feature/transport-intelligence

## Overview

Four changes working together to upgrade the transport form from plain text inputs to a fully
intelligent, timezone-aware, map-ready experience — consistent with how other parts of the app
already use Mapbox for destinations and activities.

1. Mapbox-powered location search replaces plain text boxes, category-filtered by transport type
2. Backend timezone endpoint determines timezone from coordinates using `timezonefinder`
3. Duration display shown live in the form and on transport items, timezone-correct
4. Seat class field for flights stored in `extra` JSON

No new database tables. Two new nullable columns on `trip_transports`. One new pip dependency
(`timezonefinder`). One new backend endpoint.

---

## Section 1 — Frontend Components

### New: `frontend/components/transport/TransportLocationSearch.tsx`

A reusable autocomplete input that calls the Mapbox Search API
(`/search/searchbox/v1/suggest`) with a `poi_category` filter determined by transport type:

| Transport type | Mapbox `poi_category` |
|---|---|
| flight | `airport` |
| train | `train_station` |
| bus | `bus_station` |
| ferry | `ferry_terminal` |
| drive / other | _(no category — general geocoding)_ |

Behaviour:
- Debounced input (300ms) fires Mapbox Suggest API
- Shows dropdown of up to 6 results: place name + location subtitle
- Keyboard navigable (arrow keys, enter, escape)
- On selection: stores place name, coordinates (`lat`/`lng`), fires `GET /timezone?lat=X&lng=Y`
  to resolve timezone, then calls back with `{ name, lat, lng, timezone }`
- Falls back gracefully if timezone lookup fails (stores coordinates without timezone)

### Changes to `frontend/components/transport/TransportForm.tsx`

- Replace origin and destination plain text inputs with `TransportLocationSearch`
- When origin timezone + destination timezone + departure time + arrival time are all known:
  show an inline **"Duration: Xh Ym"** badge below the time fields using the existing
  `calculateFlightDuration()` from `timezone-utils.ts`
- For flight type only: add a **Seat Class** row with 4 pill buttons:
  Economy | Premium Economy | Business | First
  - Defaults to Economy
  - Stored in `extra.seat_class`
  - Only shown when transport type is `flight`

### Changes to `frontend/components/transport/TransportItem.tsx`

- Show duration string if `origin_timezone` + `destination_timezone` + both times are present
- Show seat class badge for flights (e.g. "Business · EK415")

### No changes to

- `TransportOptionForm.tsx` / `TransportOptionList.tsx` — unaffected
- `useTransport.ts` — background Nominatim geocoding removed for origin/destination
  (Mapbox now provides coordinates at selection time); hook otherwise unchanged
- `transport-config.ts` — seat class is handled inside `TransportForm` directly
- `AirportAutocomplete.tsx` — superseded by `TransportLocationSearch` for flights;
  can be kept or removed in a follow-up

---

## Section 2 — Backend Changes

### New endpoint: `GET /timezone`

**File:** `app/routers/timezone.py`

```
GET /timezone?lat=51.4775&lng=-0.4614
Authorization: Bearer <token>

→ 200 { "timezone": "Europe/London" }
→ 200 { "timezone": null }   (ocean / no result)
→ 400                         (missing or invalid lat/lng)
→ 401                         (no token)
```

Uses `timezonefinder.TimezoneFinder().timezone_at(lat=lat, lng=lng)`.
Offline — no external API calls after package install.

**Register in `app/main.py`** and **`app/routers/__init__.py`**.

### New pip dependency

```
timezonefinder>=6.2.0
```

Add to `requirements.txt`. ~20MB data files bundled, pure Python, no API key.

### Migration — `app/core/migrations.py`

Add to `run_migrations()` via `add_column_if_not_exists()`:

| Table | Column | Type |
|---|---|---|
| `trip_transports` | `origin_timezone` | `VARCHAR(50) NULL` |
| `trip_transports` | `destination_timezone` | `VARCHAR(50) NULL` |

### Schema updates — `app/schemas/trip_transport.py`

Add to `TripTransportBase`, `TripTransportUpdate`, and `TripTransportRead`:

```python
origin_timezone: str | None = None
destination_timezone: str | None = None
```

### Existing logic unaffected

- Expense sync (`_sync_transport_expense`) — no changes
- Coordinate columns (`origin_latitude` etc.) — populated by Mapbox selection, same as before
- All existing transport endpoints — no behavioural changes

---

## Section 3 — Tests

### New: `tests/test_timezone_endpoint.py`

- Valid coordinates (Heathrow: `51.4775, -0.4614`) → returns `"Europe/London"`
- Mid-ocean coordinates → returns `{ timezone: null }`, not an error
- Missing `lat` param → 400
- Missing `lng` param → 400
- Non-numeric `lat`/`lng` → 400
- No auth token → 401

### New: `tests/test_transport_timezones.py`

- Creating a transport with `origin_timezone` + `destination_timezone` persists correctly
- Updating timezones on an existing transport works via PUT
- Existing transports without timezones are unaffected (nullable columns)
- `calculateFlightDuration("10:00", "13:00", "America/New_York", "Europe/London")`:
  verifies correct UTC-adjusted minute count (this utility exists but has no tests today)

### Existing tests

`test_transport_expense_sync.py` and `test_transport_coordinates.py` pass unchanged.

---

## Files Changed

### Backend
| File | Change |
|---|---|
| `app/routers/timezone.py` | New — `GET /timezone` endpoint |
| `app/routers/__init__.py` | Register timezone router |
| `app/main.py` | Include timezone router |
| `app/core/migrations.py` | Add `origin_timezone`, `destination_timezone` columns |
| `app/schemas/trip_transport.py` | Add timezone fields to base/update/read schemas |
| `requirements.txt` | Add `timezonefinder>=6.2.0` |
| `tests/test_timezone_endpoint.py` | New — endpoint tests |
| `tests/test_transport_timezones.py` | New — schema persistence + duration calculation tests |

### Frontend
| File | Change |
|---|---|
| `frontend/components/transport/TransportLocationSearch.tsx` | New — Mapbox category-aware autocomplete |
| `frontend/components/transport/TransportForm.tsx` | Wire in `TransportLocationSearch`, duration badge, seat class |
| `frontend/components/transport/TransportItem.tsx` | Show duration + seat class |
| `frontend/components/transport/index.ts` | Export `TransportLocationSearch` |

---

## Out of Scope (post-v1)

- Layovers / connecting flights
- Terminal information (T1, T2)
- Carbon footprint estimate
- Codeshare flight display
- Removing / archiving `AirportAutocomplete.tsx`
