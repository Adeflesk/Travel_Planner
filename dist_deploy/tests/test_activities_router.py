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


def test_create_activity(client, test_user, db_session):
    """Test creating an activity on a destination"""
    db = db_session

    # Create trip and destination
    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Paris",
        trip_id=trip.id,
        country="France",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Create activity
    payload = {
        "name": "Visit Eiffel Tower",
        "description": "See the tower",
        "activity_type": "sightseeing",
        "scheduled_date": "2030-01-02",
        "destination_id": dest.id,
        "is_todo": False,
    }
    resp = client.post("/activities/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Visit Eiffel Tower"
    assert data["destination_id"] == dest.id


def test_create_activity_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot create activity on shared trip"""
    db = db_session

    # Create trip as another user
    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Berlin",
        trip_id=trip.id,
        country="Germany",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Share trip with test user
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    # Try to create activity
    payload = {
        "name": "Activity",
        "destination_id": dest.id,
    }
    resp = client.post("/activities/", json=payload)
    assert resp.status_code == 404  # Non-owner can't create


def test_get_destination_activities(client, test_user, db_session):
    """Test listing activities for a destination"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Rome",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Add activities
    act1 = models.Activity(name="Colosseum", destination_id=dest.id, status="planned")
    act2 = models.Activity(name="Vatican", destination_id=dest.id, status="planned")
    db.add_all([act1, act2])
    db.commit()

    resp = client.get(f"/destinations/{dest.id}/activities/")
    assert resp.status_code == 200
    activities = resp.json()
    assert len(activities) == 2
    assert any(a["name"] == "Colosseum" for a in activities)


def test_get_destination_activities_shared(client, test_user, db_session):
    """Test reading activities on shared trip"""
    db = db_session

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Madrid",
        trip_id=trip.id,
        country="Spain",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Add activity
    act = models.Activity(name="Prado Museum", destination_id=dest.id)
    db.add(act)

    # Share with test user
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.get(f"/destinations/{dest.id}/activities/")
    assert resp.status_code == 200
    activities = resp.json()
    assert len(activities) == 1


def test_get_destination_activities_not_found(client, test_user):
    """Test 404 for non-existent destination"""
    resp = client.get("/destinations/99999/activities/")
    assert resp.status_code == 404


def test_update_activity(client, test_user, db_session):
    """Test updating an activity"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="London",
        trip_id=trip.id,
        country="UK",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    act = models.Activity(name="Big Ben", destination_id=dest.id, status="planned")
    db.add(act)
    db.commit()
    db.refresh(act)

    payload = {"name": "Big Ben & Parliament", "status": "scheduled"}
    resp = client.put(f"/activities/{act.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Big Ben & Parliament"
    assert data["status"] == "scheduled"


def test_update_activity_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot update activity"""
    db = db_session

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Barcelona",
        trip_id=trip.id,
        country="Spain",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    act = models.Activity(name="Sagrada Familia", destination_id=dest.id)
    db.add(act)
    db.commit()
    db.refresh(act)

    # Share but don't give edit permission
    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    payload = {"name": "Updated"}
    resp = client.put(f"/activities/{act.id}", json=payload)
    assert resp.status_code == 404


def test_update_activity_not_found(client, test_user):
    """Test 404 for non-existent activity"""
    payload = {"name": "Update"}
    resp = client.put("/activities/99999", json=payload)
    assert resp.status_code == 404


def test_delete_activity(client, test_user, db_session):
    """Test deleting an activity"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Amsterdam",
        trip_id=trip.id,
        country="Netherlands",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    act = models.Activity(name="Canal Tour", destination_id=dest.id)
    db.add(act)
    db.commit()
    db.refresh(act)

    resp = client.delete(f"/activities/{act.id}")
    assert resp.status_code == 204

    # Verify deleted
    deleted_act = db.query(models.Activity).filter(models.Activity.id == act.id).first()
    assert deleted_act is None


def test_delete_activity_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot delete activity"""
    db = db_session

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Venice",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    act = models.Activity(name="Gondola Ride", destination_id=dest.id)
    db.add(act)
    db.commit()
    db.refresh(act)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.delete(f"/activities/{act.id}")
    assert resp.status_code == 404


def test_delete_activity_not_found(client, test_user):
    """Test 404 for deleting non-existent activity"""
    resp = client.delete("/activities/99999")
    assert resp.status_code == 404
