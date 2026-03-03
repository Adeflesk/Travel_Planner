# Backend Geocoding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move activity and destination geocoding from the client-side Nominatim hook to synchronous server-side Mapbox calls on save, storing coordinates permanently in the database.

**Architecture:** A new `app/services/geocoding.py` wraps the Mapbox Geocoding API v5 via `httpx`. The activities and destinations routers call `geocode()` before `db.commit()` when a location string is present and no coordinates were provided by the client. Failures are silent — a failed geocode never fails the save.

**Tech Stack:** Python 3.13, FastAPI, httpx (already in requirements.txt), Mapbox Geocoding API v5, pytest + unittest.mock

---

### Task 1: Geocoding service

**Files:**
- Create: `app/services/geocoding.py`
- Test: `tests/test_geocoding.py`

**Step 1: Write the failing tests**

Create `tests/test_geocoding.py`:

```python
import os
from unittest.mock import patch, Mock

import pytest


def test_geocode_returns_lat_lng_on_success():
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "features": [{"center": [-2.3522, 48.8566]}]  # Mapbox: [lng, lat]
    }

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode
            result = geocode("Paris, France")

    assert result == (48.8566, -2.3522)  # returns (lat, lng)


def test_geocode_returns_none_on_empty_features():
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"features": []}

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode
            result = geocode("Nowhere Special")

    assert result is None


def test_geocode_returns_none_on_non_200():
    mock_response = Mock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"message": "Unauthorized"}

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode
            result = geocode("Paris")

    assert result is None


def test_geocode_returns_none_when_token_missing():
    env = {k: v for k, v in os.environ.items() if k != "MAPBOX_TOKEN"}
    with patch.dict(os.environ, env, clear=True):
        import importlib
        import app.services.geocoding as geo_module
        importlib.reload(geo_module)
        result = geo_module.geocode("Paris")

    assert result is None


def test_geocode_returns_none_on_network_error():
    import httpx

    with patch("app.services.geocoding.httpx.get", side_effect=httpx.RequestError("timeout")):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode
            result = geocode("Paris")

    assert result is None
```

**Step 2: Run to confirm all fail**

```bash
source .venv/bin/activate
pytest tests/test_geocoding.py -v
```

Expected: 5 failures with `ModuleNotFoundError` or `ImportError`

**Step 3: Implement the geocoding service**

Create `app/services/geocoding.py`:

```python
"""
app/services/geocoding.py - Mapbox geocoding service

Geocodes a location string to (lat, lng) coordinates.
Returns None on any failure — geocoding must never block a save.
"""

import logging
import os
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")
MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"


def geocode(query: str) -> tuple[float, float] | None:
    """
    Geocode a location string using Mapbox Geocoding API v5.

    Returns (lat, lng) on success, None on any failure.
    Never raises — callers should proceed with null coords if this returns None.
    """
    if not MAPBOX_TOKEN:
        logger.warning("MAPBOX_TOKEN not set — geocoding skipped")
        return None

    if not query or not query.strip():
        return None

    try:
        url = MAPBOX_GEOCODING_URL.format(query=quote(query))
        response = httpx.get(
            url,
            params={
                "access_token": MAPBOX_TOKEN,
                "limit": 1,
                "types": "place,address,poi",
            },
            timeout=5.0,
        )
        if response.status_code != 200:
            logger.warning("Mapbox geocoding returned %d for query: %s", response.status_code, query)
            return None

        data = response.json()
        features = data.get("features", [])
        if not features:
            return None

        # Mapbox returns [longitude, latitude] — we store (lat, lng)
        lng, lat = features[0]["center"]
        return (lat, lng)

    except Exception as e:
        logger.warning("Geocoding failed for %r: %s", query, e)
        return None
```

**Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_geocoding.py -v
```

Expected: 5 PASSED

**Step 5: Commit**

```bash
git add app/services/geocoding.py tests/test_geocoding.py
git commit -m "feat: add Mapbox geocoding service"
```

---

### Task 2: Geocode activities on save

**Files:**
- Modify: `app/routers/activities.py`
- Test: `tests/test_activities_router.py`

**Step 1: Write the failing tests**

Add to `tests/test_activities_router.py`:

```python
from unittest.mock import patch


def test_create_activity_geocodes_location(client, test_user, db_session):
    """Activity with location but no coords gets geocoded on create."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch("app.routers.activities.geocode", return_value=(48.8566, 2.3522)) as mock_geo:
        resp = client.post(
            "/activities/",
            json={"title": "Eiffel Tower", "day_id": day.id, "location": "Eiffel Tower, Paris"},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] == 48.8566
    assert data["longitude"] == 2.3522
    mock_geo.assert_called_once_with("Eiffel Tower, Paris")


def test_create_activity_skips_geocode_when_coords_provided(client, test_user, db_session):
    """Activity with explicit coords skips geocoding."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch("app.routers.activities.geocode") as mock_geo:
        resp = client.post(
            "/activities/",
            json={
                "title": "Eiffel Tower",
                "day_id": day.id,
                "location": "Paris",
                "latitude": 48.8566,
                "longitude": 2.3522,
            },
        )

    assert resp.status_code == 201
    mock_geo.assert_not_called()


def test_create_activity_succeeds_when_geocode_fails(client, test_user, db_session):
    """Geocoding failure does not fail the save."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch("app.routers.activities.geocode", return_value=None):
        resp = client.post(
            "/activities/",
            json={"title": "Mystery Place", "day_id": day.id, "location": "Nowhere"},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] is None
    assert data["longitude"] is None


def test_update_activity_geocodes_new_location(client, test_user, db_session):
    """Updating location with no coords triggers re-geocoding."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    # Create activity without coords
    resp = client.post("/activities/", json={"title": "A", "day_id": day.id})
    activity_id = resp.json()["id"]

    with patch("app.routers.activities.geocode", return_value=(51.5074, -0.1278)) as mock_geo:
        resp = client.patch(
            f"/activities/{activity_id}",
            json={"location": "London"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 51.5074
    mock_geo.assert_called_once_with("London")
```

**Step 2: Run to confirm they fail**

```bash
pytest tests/test_activities_router.py::test_create_activity_geocodes_location \
       tests/test_activities_router.py::test_create_activity_skips_geocode_when_coords_provided \
       tests/test_activities_router.py::test_create_activity_succeeds_when_geocode_fails \
       tests/test_activities_router.py::test_update_activity_geocodes_new_location -v
```

Expected: 4 failures (geocode not imported/called)

**Step 3: Add geocoding to the activities router**

In `app/routers/activities.py`, add the import near the top (after existing imports):

```python
from app.services.geocoding import geocode
```

In `create_activity`, add after `db_activity = models.DayActivity(**activity.model_dump())` and before the auth block:

```python
    # Geocode location if no coordinates were provided by the client
    if db_activity.location and db_activity.latitude is None:
        coords = geocode(db_activity.location)
        if coords:
            db_activity.latitude, db_activity.longitude = coords
```

In `update_activity`, add after the `setattr` loop and before `db.commit()`:

```python
    # Re-geocode if location changed and latitude is now None
    if activity.location and activity.latitude is None:
        coords = geocode(activity.location)
        if coords:
            activity.latitude, activity.longitude = coords
```

**Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_activities_router.py -v
```

Expected: all PASSED (including existing tests)

**Step 5: Commit**

```bash
git add app/routers/activities.py tests/test_activities_router.py
git commit -m "feat: geocode activity location on create and update"
```

---

### Task 3: Geocode destinations on save

**Files:**
- Modify: `app/routers/destinations.py`
- Test: `tests/test_destinations_router.py`

**Step 1: Write the failing tests**

Add to `tests/test_destinations_router.py`:

```python
from unittest.mock import patch
from datetime import date
from app import models


def _make_trip(db, user_id):
    trip = models.Trip(
        name="GeoTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_create_destination_geocodes_name(client, test_user, db_session):
    """Destination without coords gets geocoded on create."""
    trip = _make_trip(db_session, test_user["user"].id)

    with patch("app.routers.destinations.geocode", return_value=(48.8566, 2.3522)) as mock_geo:
        resp = client.post(
            "/destinations/",
            json={"name": "Paris", "country": "France", "trip_id": trip.id},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] == 48.8566
    assert data["longitude"] == 2.3522
    mock_geo.assert_called_once_with("Paris, France")


def test_create_destination_skips_geocode_when_coords_provided(client, test_user, db_session):
    """Destination with explicit coords skips geocoding."""
    trip = _make_trip(db_session, test_user["user"].id)

    with patch("app.routers.destinations.geocode") as mock_geo:
        resp = client.post(
            "/destinations/",
            json={
                "name": "Paris",
                "country": "France",
                "trip_id": trip.id,
                "latitude": 48.8566,
                "longitude": 2.3522,
            },
        )

    assert resp.status_code == 201
    mock_geo.assert_not_called()


def test_create_destination_geocodes_name_only_when_no_country(client, test_user, db_session):
    """Destination without country geocodes name alone."""
    trip = _make_trip(db_session, test_user["user"].id)

    with patch("app.routers.destinations.geocode", return_value=(35.6762, 139.6503)) as mock_geo:
        resp = client.post(
            "/destinations/",
            json={"name": "Tokyo", "trip_id": trip.id},
        )

    assert resp.status_code == 201
    mock_geo.assert_called_once_with("Tokyo")


def test_update_destination_geocodes_when_lat_cleared(client, test_user, db_session):
    """Updating destination name with null latitude triggers re-geocoding."""
    trip = _make_trip(db_session, test_user["user"].id)
    dest = models.Destination(name="Old City", trip_id=trip.id, latitude=1.0, longitude=1.0)
    db_session.add(dest)
    db_session.commit()
    db_session.refresh(dest)

    with patch("app.routers.destinations.geocode", return_value=(48.8566, 2.3522)) as mock_geo:
        resp = client.put(
            f"/destinations/{dest.id}",
            json={"name": "Paris", "latitude": None, "longitude": None},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 48.8566
    mock_geo.assert_called_once()
```

**Step 2: Run to confirm they fail**

```bash
pytest tests/test_destinations_router.py::test_create_destination_geocodes_name \
       tests/test_destinations_router.py::test_create_destination_skips_geocode_when_coords_provided \
       tests/test_destinations_router.py::test_create_destination_geocodes_name_only_when_no_country \
       tests/test_destinations_router.py::test_update_destination_geocodes_when_lat_cleared -v
```

Expected: 4 failures

**Step 3: Add geocoding to the destinations router**

In `app/routers/destinations.py`, add the import:

```python
from app.services.geocoding import geocode
```

In `create_destination`, add after `db_destination = models.Destination(**destination.model_dump())` and before `db.add(db_destination)`:

```python
    # Geocode name if no coordinates were provided
    if db_destination.latitude is None:
        query = ", ".join(filter(None, [db_destination.name, db_destination.country]))
        if query:
            coords = geocode(query)
            if coords:
                db_destination.latitude, db_destination.longitude = coords
```

In `update_destination`, add after the `setattr` loop and before `db.commit()`:

```python
    # Re-geocode if latitude is now None (e.g. name changed, coords cleared)
    if destination.latitude is None and destination.name:
        query = ", ".join(filter(None, [destination.name, destination.country]))
        coords = geocode(query)
        if coords:
            destination.latitude, destination.longitude = coords
```

**Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_destinations_router.py -v
```

Expected: all PASSED

**Step 5: Commit**

```bash
git add app/routers/destinations.py tests/test_destinations_router.py
git commit -m "feat: geocode destination name on create and update"
```

---

### Task 4: Environment variable & docs

**Files:**
- Modify: `docs/deployment.md`

**Step 1: Add `MAPBOX_TOKEN` to the Environment Variables Reference table in `docs/deployment.md`**

Find the table that contains `OPENWEATHER_API_KEY`. Add a new row:

```markdown
| `MAPBOX_TOKEN` | No | Mapbox public token for server-side geocoding |
```

Also add to the Fly.io secrets section (near `OPENWEATHER_API_KEY`):

```bash
fly secrets set MAPBOX_TOKEN=pk.your-token-here
```

**Step 2: Add to local `.env.example` (if it exists) or note in deployment.md**

Check if `.env.example` exists:
```bash
ls .env.example 2>/dev/null && echo "exists" || echo "no .env.example"
```

If it exists, add: `MAPBOX_TOKEN=pk.your-mapbox-token-here`

**Step 3: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: document MAPBOX_TOKEN env var for backend geocoding"
```

---

### Task 5: Full test suite + lint

**Step 1: Run full backend test suite**

```bash
source .venv/bin/activate
pytest tests/ -v
```

Expected: all tests pass

**Step 2: Run flake8**

```bash
flake8 app/services/geocoding.py app/routers/activities.py app/routers/destinations.py --max-line-length=100
```

Expected: no errors

**Step 3: Push**

```bash
git push
```

---

### Post-implementation: Set the Fly.io secret

After the deploy completes, set the Mapbox token in production:

```bash
fly secrets set MAPBOX_TOKEN=pk.your-token-here --app travel-planner-api-weathered-tree-9345
```

Verify it took effect:
```bash
fly ssh console --app travel-planner-api-weathered-tree-9345 --command "bash -c 'cd /app && python -c \"import os; print(bool(os.getenv(\\\"MAPBOX_TOKEN\\\")))\"\'"
```

Expected: `True`
