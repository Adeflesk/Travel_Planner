"""
Router tests for segment-based stop option endpoints.

Covers: POST/GET/PUT/DELETE/PATCH /segments/{segment_id}/stop-options/
"""
from datetime import date
from decimal import Decimal

from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_trip(db, user_id):
    trip = models.Trip(
        name="Test Trip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _make_journey(db, trip_id):
    journey = models.Journey(trip_id=trip_id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey


def _make_stop_segment(db, journey_id, order=0):
    """Create a STOP segment using the lowercase 'stop' type the router expects."""
    seg = models.JourneySegment(
        journey_id=journey_id,
        segment_type="stop",  # router checks lowercase equality
        origin_name="City Centre",
        order=order,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


def _make_transfer_segment(db, journey_id, order=0):
    seg = models.JourneySegment(
        journey_id=journey_id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=order,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


def _make_other_user(db, email="other@example.com"):
    """Create a second user who will own resources that the test_user cannot access."""
    user = models.User(
        email=email, hashed_password="x", full_name="Other", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# POST /segments/{id}/stop-options/
# ---------------------------------------------------------------------------


def test_create_segment_stop_option(client, test_user, db_session):
    """Creating a stop option on a stop segment returns 201 with the new option."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    payload = {
        "name": "Museum Visit",
        "option_type": "sightseeing",
        "estimated_duration": 90,
        "estimated_cost": "15.00",
        "currency": "EUR",
        "status": "considering",
    }
    resp = client.post(f"/segments/{seg.id}/stop-options/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Museum Visit"
    assert data["option_type"] == "sightseeing"
    assert data["estimated_duration"] == 90
    assert float(data["estimated_cost"]) == 15.0
    assert data["currency"] == "EUR"
    assert data["status"] == "considering"
    assert data["segment_id"] == seg.id


def test_create_stop_option_on_non_stop_segment_rejected(client, test_user, db_session):
    """Adding a stop option to a transport segment returns 400."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_transfer_segment(db, journey.id)

    resp = client.post(f"/segments/{seg.id}/stop-options/", json={"name": "Lunch"})
    assert resp.status_code == 400
    assert "stop segments" in resp.json()["detail"].lower()


def test_create_stop_option_nonexistent_segment(client, test_user):
    """Adding a stop option to a non-existent segment returns 404."""
    resp = client.post("/segments/99999/stop-options/", json={"name": "Ghost"})
    assert resp.status_code == 404


def test_create_stop_option_unauthorized(client, test_user, db_session):
    """test_user cannot add a stop option to another user's segment."""
    db = db_session
    other = _make_other_user(db, "intruder@example.com")
    trip = _make_trip(db, other.id)  # owned by other, not test_user
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.post(f"/segments/{seg.id}/stop-options/", json={"name": "Sneaky"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /segments/{id}/stop-options/
# ---------------------------------------------------------------------------


def test_list_segment_stop_options_empty(client, test_user, db_session):
    """Listing stop options on a segment with none returns an empty list."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.get(f"/segments/{seg.id}/stop-options/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_segment_stop_options(client, test_user, db_session):
    """All stop options for a segment are returned."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt_a = models.StopOption(segment_id=seg.id, name="Option A", order=0)
    opt_b = models.StopOption(segment_id=seg.id, name="Option B", order=1)
    db.add_all([opt_a, opt_b])
    db.commit()

    resp = client.get(f"/segments/{seg.id}/stop-options/")
    assert resp.status_code == 200
    names = [o["name"] for o in resp.json()]
    assert "Option A" in names
    assert "Option B" in names


def test_list_segment_stop_options_ordered(client, test_user, db_session):
    """Stop options are returned ordered by (order, name)."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    db.add_all(
        [
            models.StopOption(segment_id=seg.id, name="Third", order=2),
            models.StopOption(segment_id=seg.id, name="First", order=0),
            models.StopOption(segment_id=seg.id, name="Second", order=1),
        ]
    )
    db.commit()

    resp = client.get(f"/segments/{seg.id}/stop-options/")
    assert resp.status_code == 200
    names = [o["name"] for o in resp.json()]
    assert names == ["First", "Second", "Third"]


def test_list_segment_stop_options_nonexistent_segment(client, test_user):
    """Listing stop options for a non-existent segment returns 404."""
    resp = client.get("/segments/99999/stop-options/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /segments/{id}/stop-options/{option_id}
# ---------------------------------------------------------------------------


def test_update_segment_stop_option(client, test_user, db_session):
    """Updating a stop option returns the updated object."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt = models.StopOption(
        segment_id=seg.id,
        name="Original",
        status="considering",
        estimated_cost=Decimal("10.00"),
    )
    db.add(opt)
    db.commit()
    db.refresh(opt)

    resp = client.put(
        f"/segments/{seg.id}/stop-options/{opt.id}",
        json={"name": "Updated", "status": "selected", "estimated_cost": "25.00"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated"
    assert data["status"] == "selected"
    assert float(data["estimated_cost"]) == 25.0


def test_update_segment_stop_option_not_found(client, test_user, db_session):
    """Updating a non-existent stop option returns 404."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.put(
        f"/segments/{seg.id}/stop-options/99999",
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404


def test_update_segment_stop_option_unauthorized(client, test_user, db_session):
    """test_user cannot update a stop option on another user's segment."""
    db = db_session
    other = _make_other_user(db, "thief@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt = models.StopOption(segment_id=seg.id, name="Protected")
    db.add(opt)
    db.commit()
    db.refresh(opt)

    resp = client.put(
        f"/segments/{seg.id}/stop-options/{opt.id}",
        json={"name": "Hacked"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /segments/{id}/stop-options/{option_id}
# ---------------------------------------------------------------------------


def test_delete_segment_stop_option(client, test_user, db_session):
    """Deleting a stop option returns 204 and the option is gone."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt = models.StopOption(segment_id=seg.id, name="To Delete")
    db.add(opt)
    db.commit()
    db.refresh(opt)
    opt_id = opt.id

    resp = client.delete(f"/segments/{seg.id}/stop-options/{opt_id}")
    assert resp.status_code == 204

    gone = db.query(models.StopOption).filter(models.StopOption.id == opt_id).first()
    assert gone is None


def test_delete_segment_stop_option_not_found(client, test_user, db_session):
    """Deleting a non-existent stop option returns 404."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.delete(f"/segments/{seg.id}/stop-options/99999")
    assert resp.status_code == 404


def test_delete_segment_stop_option_unauthorized(client, test_user, db_session):
    """test_user cannot delete a stop option on another user's segment."""
    db = db_session
    other = _make_other_user(db, "vandal@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt = models.StopOption(segment_id=seg.id, name="Mine")
    db.add(opt)
    db.commit()
    db.refresh(opt)

    resp = client.delete(f"/segments/{seg.id}/stop-options/{opt.id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /segments/{id}/stop-options/{option_id}/status
# ---------------------------------------------------------------------------


def test_patch_segment_stop_option_status(client, test_user, db_session):
    """Patching status updates only the status field."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    opt = models.StopOption(segment_id=seg.id, name="Café", status="considering")
    db.add(opt)
    db.commit()
    db.refresh(opt)

    resp = client.patch(
        f"/segments/{seg.id}/stop-options/{opt.id}/status",
        json={"status": "selected"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "selected"
    assert resp.json()["name"] == "Café"  # other fields unchanged


def test_patch_segment_stop_option_status_not_found(client, test_user, db_session):
    """Patching status of a non-existent option returns 404."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.patch(
        f"/segments/{seg.id}/stop-options/99999/status",
        json={"status": "done"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Field validation
# ---------------------------------------------------------------------------


def test_stop_option_all_fields_roundtrip(client, test_user, db_session):
    """Creating a stop option with all optional fields persists them correctly."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    payload = {
        "name": "Fancy Dinner",
        "description": "Michelin star restaurant",
        "option_type": "meal",
        "estimated_duration": 120,
        "estimated_cost": "80.00",
        "currency": "EUR",
        "url": "https://example.com/reservation",
        "notes": "Book 2 weeks ahead",
        "status": "selected",
        "order": 3,
    }
    resp = client.post(f"/segments/{seg.id}/stop-options/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["description"] == "Michelin star restaurant"
    assert data["option_type"] == "meal"
    assert data["estimated_duration"] == 120
    assert float(data["estimated_cost"]) == 80.0
    assert data["currency"] == "EUR"
    assert data["url"] == "https://example.com/reservation"
    assert data["notes"] == "Book 2 weeks ahead"
    assert data["status"] == "selected"
    assert data["order"] == 3


def test_stop_option_negative_cost_rejected(client, test_user, db_session):
    """A negative estimated_cost is rejected with 422."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.post(
        f"/segments/{seg.id}/stop-options/",
        json={"name": "Bad Cost", "estimated_cost": "-5.00"},
    )
    assert resp.status_code == 422


def test_stop_option_negative_duration_rejected(client, test_user, db_session):
    """A negative estimated_duration is rejected with 422."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_stop_segment(db, journey.id)

    resp = client.post(
        f"/segments/{seg.id}/stop-options/",
        json={"name": "Bad Duration", "estimated_duration": -10},
    )
    assert resp.status_code == 422
