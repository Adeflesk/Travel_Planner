"""
Router tests for journey segment endpoints.

Covers:
  GET  /journeys/{id}/segments
  POST /journeys/{id}/segments
  GET  /journey-segments/{id}
  PUT  /journey-segments/{id}
  DELETE /journey-segments/{id}
"""
from datetime import date

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


def _make_segment(db, journey_id, segment_type="TRANSFER", order=0):
    seg = models.JourneySegment(
        journey_id=journey_id,
        segment_type=segment_type,
        origin_name="Airport",
        destination_name="Hotel",
        order=order,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


def _make_other_user(db, email="other@example.com"):
    """Create another user who owns resources that test_user cannot access."""
    user = models.User(
        email=email, hashed_password="x", full_name="Other", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# GET /journeys/{id}/segments
# ---------------------------------------------------------------------------


def test_list_journey_segments_empty(client, test_user, db_session):
    """Listing segments for a journey with none returns an empty list."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/segments")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_journey_segments(client, test_user, db_session):
    """All segments for a journey are returned."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    _make_segment(db, journey.id, order=0)
    _make_segment(db, journey.id, order=1)

    resp = client.get(f"/journeys/{journey.id}/segments")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_journey_segments_not_found(client, test_user):
    """Listing segments for a non-existent journey returns 404."""
    resp = client.get("/journeys/99999/segments")
    assert resp.status_code == 404


def test_list_journey_segments_unauthorized(client, test_user, db_session):
    """test_user cannot list segments for a journey on another user's trip."""
    db = db_session
    other = _make_other_user(db, "spy@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)

    resp = client.get(f"/journeys/{journey.id}/segments")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /journeys/{id}/segments
# ---------------------------------------------------------------------------


def test_create_journey_segment(client, test_user, db_session):
    """Creating a segment returns 201 with the new segment."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    payload = {
        "journey_id": journey.id,
        "segment_type": "FLIGHT",
        "origin_name": "DUB",
        "destination_name": "LHR",
        "order": 0,
    }
    resp = client.post(f"/journeys/{journey.id}/segments", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["segment_type"] == "FLIGHT"
    assert data["origin_name"] == "DUB"
    assert data["destination_name"] == "LHR"
    assert data["journey_id"] == journey.id


def test_create_journey_segment_journey_id_mismatch(client, test_user, db_session):
    """Payload journey_id mismatching URL journey_id returns 400."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    journey2 = _make_journey(db, trip.id)

    payload = {
        "journey_id": journey2.id,  # different from URL param
        "segment_type": "TRANSFER",
        "origin_name": "A",
        "destination_name": "B",
        "order": 0,
    }
    resp = client.post(f"/journeys/{journey.id}/segments", json=payload)
    assert resp.status_code == 400


def test_create_journey_segment_nonexistent_journey(client, test_user):
    """Creating a segment for a non-existent journey returns 404."""
    payload = {
        "journey_id": 99999,
        "segment_type": "TRANSFER",
        "origin_name": "A",
        "destination_name": "B",
        "order": 0,
    }
    resp = client.post("/journeys/99999/segments", json=payload)
    assert resp.status_code == 404


def test_create_journey_segment_unauthorized(client, test_user, db_session):
    """test_user cannot add segments to another user's journey."""
    db = db_session
    other = _make_other_user(db, "crasher@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)

    payload = {
        "journey_id": journey.id,
        "segment_type": "TRANSFER",
        "origin_name": "X",
        "destination_name": "Y",
        "order": 0,
    }
    resp = client.post(f"/journeys/{journey.id}/segments", json=payload)
    assert resp.status_code == 404


def test_create_segment_with_metadata(client, test_user, db_session):
    """Metadata dict is stored and returned on the segment."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)

    payload = {
        "journey_id": journey.id,
        "segment_type": "FLIGHT",
        "origin_name": "SFO",
        "destination_name": "JFK",
        "order": 0,
        "metadata": {"cost": "250.00", "currency": "USD", "airline": "United"},
    }
    resp = client.post(f"/journeys/{journey.id}/segments", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["metadata"]["cost"] == "250.00"
    assert data["metadata"]["airline"] == "United"


# ---------------------------------------------------------------------------
# GET /journey-segments/{id}
# ---------------------------------------------------------------------------


def test_get_journey_segment(client, test_user, db_session):
    """Getting an owned segment by ID returns it."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)

    resp = client.get(f"/journey-segments/{seg.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == seg.id
    assert data["journey_id"] == journey.id


def test_get_journey_segment_not_found(client, test_user):
    """Getting a non-existent segment returns 404."""
    resp = client.get("/journey-segments/99999")
    assert resp.status_code == 404


def test_get_journey_segment_unauthorized(client, test_user, db_session):
    """test_user cannot get a segment from another user's trip."""
    db = db_session
    other = _make_other_user(db, "lurker@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)

    resp = client.get(f"/journey-segments/{seg.id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /journey-segments/{id}
# ---------------------------------------------------------------------------


def test_update_journey_segment(client, test_user, db_session):
    """Updating a segment returns the updated object."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id, segment_type="TRANSFER")

    resp = client.put(
        f"/journey-segments/{seg.id}",
        json={
            "segment_type": "FLIGHT",
            "origin_name": "DUB",
            "destination_name": "CDG",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["segment_type"] == "FLIGHT"
    assert data["origin_name"] == "DUB"
    assert data["destination_name"] == "CDG"


def test_update_journey_segment_not_found(client, test_user):
    """Updating a non-existent segment returns 404."""
    resp = client.put("/journey-segments/99999", json={"segment_type": "FLIGHT"})
    assert resp.status_code == 404


def test_update_journey_segment_unauthorized(client, test_user, db_session):
    """test_user cannot update a segment on another user's trip."""
    db = db_session
    other = _make_other_user(db, "edit_intruder@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)

    resp = client.put(f"/journey-segments/{seg.id}", json={"origin_name": "Hacked"})
    assert resp.status_code == 404


def test_update_segment_metadata(client, test_user, db_session):
    """Updating metadata on a segment persists correctly."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)

    resp = client.put(
        f"/journey-segments/{seg.id}",
        json={"metadata": {"cost": "99.00", "notes": "window seat"}},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["metadata"]["cost"] == "99.00"
    assert data["metadata"]["notes"] == "window seat"


# ---------------------------------------------------------------------------
# DELETE /journey-segments/{id}
# ---------------------------------------------------------------------------


def test_delete_journey_segment(client, test_user, db_session):
    """Deleting a segment returns 204 and it is gone."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)
    seg_id = seg.id

    resp = client.delete(f"/journey-segments/{seg_id}")
    assert resp.status_code == 204

    gone = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == seg_id)
        .first()
    )
    assert gone is None


def test_delete_journey_segment_not_found(client, test_user):
    """Deleting a non-existent segment returns 404."""
    resp = client.delete("/journey-segments/99999")
    assert resp.status_code == 404


def test_delete_journey_segment_unauthorized(client, test_user, db_session):
    """test_user cannot delete a segment on another user's trip."""
    db = db_session
    other = _make_other_user(db, "wrecker@example.com")
    trip = _make_trip(db, other.id)  # owned by other
    journey = _make_journey(db, trip.id)
    seg = _make_segment(db, journey.id)

    resp = client.delete(f"/journey-segments/{seg.id}")
    assert resp.status_code == 404

    # Segment should still exist
    still_there = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == seg.id)
        .first()
    )
    assert still_there is not None
