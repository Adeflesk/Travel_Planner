from datetime import date
from app import models


def test_create_destination_with_coordinates(client, test_user, db_session):
    """Test creating a destination with latitude and longitude"""
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

    payload = {
        "name": "Paris",
        "country": "France",
        "trip_id": trip.id,
        "latitude": 48.8566,
        "longitude": 2.3522,
    }
    resp = client.post("/destinations/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Paris"
    assert data["latitude"] == 48.8566
    assert data["longitude"] == 2.3522


def test_update_destination_coordinates(client, test_user, db_session):
    """Test updating a destination's coordinates"""
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
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    payload = {
        "latitude": 51.5074,
        "longitude": -0.1278,
    }
    resp = client.put(f"/destinations/{dest.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 51.5074
    assert data["longitude"] == -0.1278


def test_get_destination_coordinates(client, test_user, db_session):
    """Test response includes coordinates when fetching a destination"""
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
        name="Tokyo",
        trip_id=trip.id,
        country="Japan",
        latitude=35.6762,
        longitude=139.6503,
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    resp = client.get(f"/destinations/{dest.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 35.6762
    assert data["longitude"] == 139.6503
