"""
tests/test_transport_stops_router.py - Router tests for transport stops.

Verifies wiring (auth, status codes, JSON shape, ORM adaptation) and ONE
schedule scenario end-to-end.  Scheduler edge-cases are tested in
``test_schedule_service.py`` (pure, no DB).
"""


# ---------------------------------------------------------------------------
# Helper: create a trip + transport leg for the current user
# ---------------------------------------------------------------------------


def _create_trip_and_transport(client):
    """Create a trip with a drive-type transport and return transport_id."""
    trip_resp = client.post(
        "/trips/",
        json={
            "name": "Southwest Road Trip",
            "start_date": "2026-09-09",
            "end_date": "2026-09-15",
            "budget": 3000,
        },
    )
    assert trip_resp.status_code == 201
    trip_id = trip_resp.json()["id"]

    transport_resp = client.post(
        f"/trips/{trip_id}/transport",
        json={
            "transport_type": "drive",
            "origin": "Grand Canyon South Rim",
            "destination": "Moab",
            "origin_timezone": "America/Phoenix",
            "destination_timezone": "America/Denver",
        },
    )
    assert transport_resp.status_code == 201
    return transport_resp.json()["id"]


# ---------------------------------------------------------------------------
# CRUD: Create
# ---------------------------------------------------------------------------


def test_create_stop(client):
    transport_id = _create_trip_and_transport(client)
    resp = client.post(
        f"/transport/{transport_id}/stops",
        json={
            "name": "Desert View Watchtower",
            "category": "viewpoint",
            "duration_minutes": 45,
            "drive_minutes_from_previous": 25,
            "timezone": "America/Phoenix",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Desert View Watchtower"
    assert data["category"] == "viewpoint"
    assert data["duration_minutes"] == 45
    assert data["transport_id"] == transport_id


# ---------------------------------------------------------------------------
# CRUD: List (ordered by sort_order)
# ---------------------------------------------------------------------------


def test_list_stops_ordered(client):
    transport_id = _create_trip_and_transport(client)
    client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "Second", "sort_order": 2, "drive_minutes_from_previous": 10},
    )
    client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "First", "sort_order": 1, "drive_minutes_from_previous": 5},
    )
    resp = client.get(f"/transport/{transport_id}/stops")
    assert resp.status_code == 200
    names = [s["name"] for s in resp.json()]
    assert names == ["First", "Second"]


# ---------------------------------------------------------------------------
# CRUD: Get single
# ---------------------------------------------------------------------------


def test_get_stop(client):
    transport_id = _create_trip_and_transport(client)
    create_resp = client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "A Stop", "duration_minutes": 30},
    )
    stop_id = create_resp.json()["id"]
    resp = client.get(f"/transport/{transport_id}/stops/{stop_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "A Stop"


# ---------------------------------------------------------------------------
# CRUD: Update
# ---------------------------------------------------------------------------


def test_update_stop(client):
    transport_id = _create_trip_and_transport(client)
    create_resp = client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "Old Name", "duration_minutes": 30},
    )
    stop_id = create_resp.json()["id"]
    resp = client.put(
        f"/transport/{transport_id}/stops/{stop_id}",
        json={"name": "New Name", "duration_minutes": 60},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["duration_minutes"] == 60


# ---------------------------------------------------------------------------
# CRUD: Delete
# ---------------------------------------------------------------------------


def test_delete_stop(client):
    transport_id = _create_trip_and_transport(client)
    create_resp = client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "To Delete"},
    )
    stop_id = create_resp.json()["id"]
    resp = client.delete(f"/transport/{transport_id}/stops/{stop_id}")
    assert resp.status_code == 204
    # Verify gone
    resp = client.get(f"/transport/{transport_id}/stops/{stop_id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Reorder
# ---------------------------------------------------------------------------


def test_reorder_stops(client):
    transport_id = _create_trip_and_transport(client)
    r1 = client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "Alpha", "sort_order": 0},
    )
    r2 = client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "Beta", "sort_order": 1},
    )
    id_a = r1.json()["id"]
    id_b = r2.json()["id"]

    resp = client.put(
        f"/transport/{transport_id}/stops/reorder",
        json={"stops": [{"id": id_a, "sort_order": 1}, {"id": id_b, "sort_order": 0}]},
    )
    assert resp.status_code == 200
    names = [s["name"] for s in resp.json()]
    assert names == ["Beta", "Alpha"]


# ---------------------------------------------------------------------------
# 404 for non-existent
# ---------------------------------------------------------------------------


def test_get_missing_stop_404(client):
    transport_id = _create_trip_and_transport(client)
    resp = client.get(f"/transport/{transport_id}/stops/9999")
    assert resp.status_code == 404


def test_update_missing_stop_404(client):
    transport_id = _create_trip_and_transport(client)
    resp = client.put(
        f"/transport/{transport_id}/stops/9999",
        json={"name": "Nope"},
    )
    assert resp.status_code == 404


def test_delete_missing_stop_404(client):
    transport_id = _create_trip_and_transport(client)
    resp = client.delete(f"/transport/{transport_id}/stops/9999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Auth: unauthenticated
# ---------------------------------------------------------------------------


def test_unauthenticated_stops(unauthenticated_client):
    resp = unauthenticated_client.get("/transport/1/stops")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Auth: wrong user cannot access
# ---------------------------------------------------------------------------


def test_cross_user_access_denied(client, db_session):
    """A second user should get 404 when accessing another user's transport stops."""
    from conftest import create_other_user

    transport_id = _create_trip_and_transport(client)
    client.post(
        f"/transport/{transport_id}/stops",
        json={"name": "Private Stop"},
    )

    other_user, other_token = create_other_user(db_session)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Using unauthenticated_client's underlying _client from the client fixture
    # would be complex; instead test at the API level with a raw TestClient
    from fastapi.testclient import TestClient
    from main import app

    with TestClient(app) as raw_client:
        from database import get_db
        from sqlalchemy.orm import sessionmaker
        from tests.conftest import engine as test_engine

        TestSession = sessionmaker(bind=test_engine)

        def _override():
            s = TestSession()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = _override
        resp = raw_client.get(
            f"/transport/{transport_id}/stops",
            headers=other_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Schedule endpoint (one E2E scenario)
# ---------------------------------------------------------------------------


def test_schedule_endpoint_basic(client):
    transport_id = _create_trip_and_transport(client)

    # Create two stops
    client.post(
        f"/transport/{transport_id}/stops",
        json={
            "name": "Stop A",
            "duration_minutes": 45,
            "drive_minutes_from_previous": 25,
            "sort_order": 0,
            "timezone": "America/Phoenix",
        },
    )
    client.post(
        f"/transport/{transport_id}/stops",
        json={
            "name": "Stop B",
            "duration_minutes": 30,
            "drive_minutes_from_previous": 60,
            "sort_order": 1,
            "timezone": "America/Phoenix",
        },
    )

    resp = client.get(
        f"/transport/{transport_id}/schedule",
        params={
            "departure_time": "08:00",
            "day_date": "2026-09-11",
            "day_end_target": "12:00",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["items"][0]["title"] == "Stop A"
    assert data["items"][0]["arrival_local"] == "08:25"
    assert data["items"][1]["title"] == "Stop B"
    # Stop A departs 09:10, +60 drive = 10:10
    assert data["items"][1]["arrival_local"] == "10:10"
    # Day end: 10:10 + 30 = 10:40, within 12:00 target
    assert all(w["code"] != "past_day_end" for w in data["warnings"])


def test_schedule_empty_stops(client):
    transport_id = _create_trip_and_transport(client)
    resp = client.get(
        f"/transport/{transport_id}/schedule",
        params={"departure_time": "08:00", "day_date": "2026-09-11"},
    )
    assert resp.status_code == 200
    assert resp.json()["items"] == []
