from datetime import date

from app.core.security import create_access_token
from app import models


def create_user_and_token(db, email="other@example.com"):
    user = models.User(
        email=email, hashed_password="x", full_name="Other", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return user, token


def test_create_trip(client, test_user):
    payload = {
        "name": "Test Trip",
        "description": "desc",
        "start_date": "2030-01-01",
        "end_date": "2030-01-10",
        "budget": 1000,
        "status": "planning",
    }

    resp = client.post("/trips/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Trip"
    assert "id" in data


def test_get_trips_owned_and_shared(client, db_session, test_user):
    db = db_session
    # create another user and a trip owned by them
    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OwnerTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 2),
        budget=0,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # share that trip with test user (id from test_user is 1 typically)
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.get("/trips/")
    assert resp.status_code == 200
    trips = resp.json()
    # the shared trip should appear in the list
    assert any(t.get("id") == trip.id for t in trips)


def test_get_trip_not_found(client, test_user):
    resp = client.get("/trips/99999")
    assert resp.status_code == 404


def test_get_trip_shared_access(client, db_session, test_user):
    db = db_session
    other, _ = create_user_and_token(db, "owner2@example.com")
    trip = models.Trip(
        name="OwnerTrip2",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 2),
        budget=0,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.get(f"/trips/{trip.id}")
    assert resp.status_code == 200
    data = resp.json()
    # Response should include shared_by field with owner's email
    assert data["shared_by"] == "owner2@example.com"


def test_update_trip_non_owner_forbidden(client, db_session, test_user):
    db = db_session
    other, _ = create_user_and_token(db, "owner3@example.com")
    trip = models.Trip(
        name="OwnerTrip3",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 2),
        budget=0,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # share the trip with test user
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    update = {"name": "NewName"}
    resp = client.put(f"/trips/{trip.id}", json=update)
    # require_owner=True in update -> should be treated as not found for non-owner
    assert resp.status_code == 404


def test_share_trip_errors_and_create_and_delete(
    client, db_session, test_user, base_client
):
    db = db_session
    # create a trip as test user
    resp = client.post(
        "/trips/",
        json={
            "name": "S1",
            "description": "d",
            "start_date": "2030-01-01",
            "end_date": "2030-01-02",
            "budget": 0,
            "status": "planning",
        },
    )
    assert resp.status_code == 201
    trip = resp.json()

    # share with non-existent user -> 404
    r = client.post(f"/trips/{trip['id']}/shares/", json={"email": "nope@example.com"})
    assert r.status_code == 404

    # share with self -> 400
    r2 = client.post(
        f"/trips/{trip['id']}/shares/", json={"email": test_user["user"].email}
    )
    assert r2.status_code == 400

    # create other user and share successfully
    other, token = create_user_and_token(db, "shared@example.com")
    r3 = client.post(
        f"/trips/{trip['id']}/shares/", json={"email": "shared@example.com"}
    )
    assert r3.status_code == 201
    payload = r3.json()
    assert payload.get("id") is not None
    assert payload.get("user_id") == other.id

    # share again -> 400
    r4 = client.post(
        f"/trips/{trip['id']}/shares/", json={"email": "shared@example.com"}
    )
    assert r4.status_code == 400

    # delete share as owner
    # find share id
    share_row = (
        db.query(models.TripShare)
        .filter(
            models.TripShare.trip_id == trip["id"], models.TripShare.user_id == other.id
        )
        .first()
    )
    assert share_row is not None
    rdel = client.delete(f"/trips/{trip['id']}/shares/{share_row.id}")
    assert rdel.status_code == 204

    # deleting non-existent share -> 404
    rdel2 = client.delete(f"/trips/{trip['id']}/shares/{99999}")
    assert rdel2.status_code == 404


def test_trip_context_roundtrip(client, test_user):
    """Trip.context is stored and returned correctly."""
    ctx = {"trip_type": "road_trip", "vehicle": "rental", "traveller_count": 2}
    resp = client.post(
        "/trips/",
        json={
            "name": "Context Test",
            "start_date": "2026-06-01",
            "end_date": "2026-06-10",
            "context": ctx,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["context"]["trip_type"] == "road_trip"
    assert data["context"]["vehicle"] == "rental"
