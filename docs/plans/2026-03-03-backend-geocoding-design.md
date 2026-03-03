# Backend Geocoding Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

Geocoding currently happens client-side via `useGeocode.ts`, a rate-limited Nominatim queue. This means:

- Coordinates are re-fetched from Nominatim on every page load
- Nominatim rate limits cause delays and occasional failures in production
- Map pins appear with a visible lag while geocoding completes

## Solution

Move geocoding to the backend. When an activity or destination is saved with a location string and no stored coordinates, the API geocodes the address synchronously via Mapbox before committing to the database. Coordinates are stored permanently — geocoding happens once per record, not on every page load.

## Approach

Service function called from routers (Approach A). A thin `app/services/geocoding.py` module wraps the Mapbox API. Routers call it explicitly before `db.commit()`. Simple, testable, fits existing patterns.

## Architecture

### New file: `app/services/geocoding.py`

```python
def geocode(query: str) -> tuple[float, float] | None:
    """Returns (lat, lng) or None if geocoding fails."""
```

- Calls Mapbox Geocoding API v5: `/geocoding/v5/mapbox.places/{query}.json`
- Parameters: `access_token`, `limit=1`, `types=place,address,poi`
- Returns first feature's coordinates, flipping Mapbox's `[lng, lat]` order to `(lat, lng)`
- If `MAPBOX_TOKEN` env var is absent, logs a warning and returns `None`
- All exceptions caught and returned as `None` — geocoding failure never fails the save
- No in-process cache (each address geocoded once on save; repeated calls not a concern)

### Router changes

**Activities** — `create_activity` and `update_activity` in `app/routers/activities.py`:

```python
if db_activity.location and db_activity.latitude is None:
    coords = geocode(db_activity.location)
    if coords:
        db_activity.latitude, db_activity.longitude = coords
```

**Destinations** — `create_destination` and `update_destination` in `app/routers/destinations.py`:

```python
query = ", ".join(filter(None, [db_destination.name, db_destination.country]))
if query and db_destination.latitude is None:
    coords = geocode(query)
    if coords:
        db_destination.latitude, db_destination.longitude = coords
```

**Rule:** Never overwrite coordinates the client explicitly provided. If `latitude` is present in the payload, skip geocoding. This preserves manual pin placement for any future feature.

On updates, if the client sends a new `location`/`name` and clears `latitude` to `None`, geocoding re-runs. If the client sends updated coordinates explicitly, geocoding is skipped.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `MAPBOX_TOKEN` | Mapbox public access token | Yes (geocoding silently skips if absent) |

Must be added to:
- Local `.env` file
- Fly.io secrets: `fly secrets set MAPBOX_TOKEN=pk.xxx`
- `docs/deployment.md` Environment Variables Reference

## Dependencies

- `httpx` — for async-compatible HTTP calls from FastAPI. Add to `requirements.txt` if not already present.

## Client-side impact

`useGeocode.ts` and the `DayMap.tsx` destination fallback geocoding remain in place as a safety net for records created before this feature. For new saves, coordinates are in the DB response, so the client hook becomes a no-op for those records.

## Error Handling

- Geocoding failure (network error, bad address, non-200 response, empty results, malformed JSON) → return `None`, save proceeds with null coordinates
- Missing `MAPBOX_TOKEN` → log warning at startup, return `None` immediately on every call
- Coordinates remain nullable on both models — no schema change required

## Testing

### Unit tests for `geocoding.py`

Mock `httpx` responses to verify:
- Valid response returns correct `(lat, lng)` with coordinates in the right order
- Empty `features` array returns `None`
- Non-200 HTTP response returns `None`
- Missing `MAPBOX_TOKEN` returns `None` without making an HTTP call

### Router integration tests

Extend existing activity and destination tests:
- `POST /activities/` with `location` stores non-null `latitude`/`longitude` in the response (geocoding mocked)
- `POST /activities/` with explicit `latitude` in payload skips geocoding (assert mock not called)
- `PUT /destinations/{id}` with new `name` and null `latitude` re-geocodes (geocoding mocked)

All tests mock the `geocode` function — no real Mapbox calls in CI.

## Files Changed

| File | Change |
|---|---|
| `app/services/geocoding.py` | New — Mapbox geocoding wrapper |
| `app/routers/activities.py` | Call geocode in `create_activity` and `update_activity` |
| `app/routers/destinations.py` | Call geocode in `create_destination` and `update_destination` |
| `requirements.txt` | Add `httpx` if not present |
| `docs/deployment.md` | Document `MAPBOX_TOKEN` env var |
| `tests/test_geocoding.py` | New — unit tests for geocoding service |
| `tests/test_activities.py` | Extend with geocoding integration tests |
| `tests/test_destinations.py` | Extend with geocoding integration tests |
