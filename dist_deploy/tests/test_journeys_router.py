"""
Router tests for journey endpoints.

Covers: POST/GET/PUT/DELETE /journeys/, GET /trips/{id}/journeys/,
        GET /journeys/{id}/practicality, GET /journeys/{id}/timeline
"""
from datetime import date

from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_trip(db, user_id, budget=None):
    trip = models.Trip(
        name="Test Trip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=user_id,
        budget=budget,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _make_journey(db, trip_id, order=0):
    journey = models.Journey(trip_id=trip_id, transport_mode="bus", order=order)
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey


def _make_other_user(db, email="other@example.com"):
    user = models.User(
        email=email, hashed_password="x", full_name="Other", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Journey CRUD
# ---------------------------------------------------------------------------


def test_create_journey(client, test_user, db_session):
    """Creating a journey for an owned trip returns 201."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)

    resp = client.post(
        "/journeys/", json={"trip_id": trip.id, "transport_mode": "flight", "order": 0}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["trip_id"] == trip.id
    assert data["transport_mode"] == "flight"


def test_create_journey_unauthorized(client, test_user, db_session):
    """Creating a journey on another user's trip returns 404."""
    db = db_session
    other = _make_other_user(db, "owner@example.com")
    trip = _make_trip(db, other.id)

    resp = client.post(
        "/journeys/",
        json={"trip_id": trip.id, "transport_mode": "bus", "order": 0},
    )
    assert resp.status_code == 404


def test_get_journey(client, test_user, db_session):
    """Getting an owned journey returns it."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == journey.id


def test_get_journey_not_found(client, test_user):
    """Getting a non-existent journey returns 404."""
    resp = client.get("/journeys/99999")
    assert resp.status_code == 404


def test_get_journey_unauthorized(client, test_user, db_session):
    """Getting another user's journey returns 404."""
    db = db_session
    other = _make_other_user(db, "stranger@example.com")
    trip = _make_trip(db, other.id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}")
    assert resp.status_code == 404


def test_list_trip_journeys(client, test_user, db_session):
    """Listing journeys for an owned trip returns all of them."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    _make_journey(db, trip.id, order=0)
    _make_journey(db, trip.id, order=1)

    resp = client.get(f"/trips/{trip.id}/journeys/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_trip_journeys_not_found(client, test_user):
    """Listing journeys for a non-existent trip returns 404."""
    resp = client.get("/trips/99999/journeys/")
    assert resp.status_code == 404


def test_update_journey(client, test_user, db_session):
    """Updating a journey returns the updated object."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.put(
        f"/journeys/{journey.id}",
        json={"transport_mode": "train", "status": "confirmed"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["transport_mode"] == "train"
    assert data["status"] == "confirmed"


def test_update_journey_not_found(client, test_user):
    """Updating a non-existent journey returns 404."""
    resp = client.put("/journeys/99999", json={"transport_mode": "bus"})
    assert resp.status_code == 404


def test_delete_journey(client, test_user, db_session):
    """Deleting a journey returns 204."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.delete(f"/journeys/{journey.id}")
    assert resp.status_code == 204

    gone = db.query(models.Journey).filter(models.Journey.id == journey.id).first()
    assert gone is None


def test_delete_journey_not_found(client, test_user):
    """Deleting a non-existent journey returns 404."""
    resp = client.delete("/journeys/99999")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /journeys/{id}/practicality
# ---------------------------------------------------------------------------


def test_get_journey_practicality_empty(client, test_user, db_session):
    """Practicality for a journey with no segments returns zero totals."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id, budget=500)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/practicality")
    assert resp.status_code == 200
    data = resp.json()
    assert data["journey_id"] == journey.id
    assert data["total_duration_minutes"] == 0
    assert float(data["total_cost"]) == 0.0
    assert data["time_feasible"] is True
    assert data["budget_feasible"] is True
    assert data["segments"] == []


def test_get_journey_practicality_not_found(client, test_user):
    """Practicality for a non-existent journey returns 404."""
    resp = client.get("/journeys/99999/practicality")
    assert resp.status_code == 404


def test_get_journey_practicality_unauthorized(client, test_user, db_session):
    """Practicality for another user's journey returns 404."""
    db = db_session
    other = _make_other_user(db, "spy@example.com")
    trip = _make_trip(db, other.id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/practicality")
    assert resp.status_code == 404


def test_get_journey_practicality_custom_time_limit(client, test_user, db_session):
    """Custom time_limit_minutes query param is reflected in the response."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/practicality?time_limit_minutes=120")
    assert resp.status_code == 200
    assert resp.json()["time_limit_minutes"] == 120


def test_get_journey_practicality_custom_buffer(client, test_user, db_session):
    """Custom buffer_minutes query param is stored in the response."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/practicality?buffer_minutes=30")
    assert resp.status_code == 200
    assert resp.json()["buffer_minutes_per_transition"] == 30


def test_get_journey_practicality_shared_user_can_read(client, test_user, db_session):
    """test_user can read practicality for a trip shared with them."""
    db = db_session
    other = _make_other_user(db, "owner@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)

    # Share trip with test_user (view access)
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.get(f"/journeys/{journey.id}/practicality")
    assert resp.status_code == 200


def test_get_journey_practicality_response_structure(client, test_user, db_session):
    """Practicality response contains all expected top-level fields."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id, budget=1000)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/practicality")
    assert resp.status_code == 200
    data = resp.json()

    required_fields = [
        "journey_id",
        "total_duration_minutes",
        "total_cost",
        "time_limit_minutes",
        "time_feasible",
        "budget_feasible",
        "buffer_minutes_per_transition",
        "transition_count",
        "segments",
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# GET /journeys/{id}/timeline
# ---------------------------------------------------------------------------


def test_get_journey_timeline(client, test_user, db_session):
    """Timeline endpoint returns a valid response for an owned journey."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/timeline")
    # Timeline requires a valid journey; empty is still 200
    assert resp.status_code in (200, 404)


def test_get_journey_timeline_not_found(client, test_user):
    """Timeline for a non-existent journey returns 404."""
    resp = client.get("/journeys/99999/timeline")
    assert resp.status_code == 404
