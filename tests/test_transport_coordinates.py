from datetime import date
from app import models


def test_create_transport_with_coordinates(client, test_user, db_session):
    """Test creating a transport with origin and destination coordinates"""
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
        "trip_id": trip.id,
        "transport_type": "flight",
        "origin": "SYD",
        "destination": "LHR",
        "origin_latitude": -33.9399,
        "origin_longitude": 151.1753,
        "destination_latitude": 51.4700,
        "destination_longitude": -0.4543,
    }
    resp = client.post(f"/trips/{trip.id}/transport", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_latitude"] == -33.9399
    assert data["origin_longitude"] == 151.1753
    assert data["destination_latitude"] == 51.4700
    assert data["destination_longitude"] == -0.4543


def test_update_transport_coordinates(client, test_user, db_session):
    """Test updating a transport's origin and destination coordinates"""
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

    transport = models.TripTransport(
        trip_id=trip.id,
        transport_type="train",
        origin="Paris",
        destination="London",
    )
    db.add(transport)
    db.commit()
    db.refresh(transport)

    payload = {
        "origin_latitude": 48.8566,
        "origin_longitude": 2.3522,
        "destination_latitude": 51.5074,
        "destination_longitude": -0.1278,
    }
    resp = client.put(f"/transport/{transport.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["origin_latitude"] == 48.8566
    assert data["destination_longitude"] == -0.1278


def test_get_transport_coordinates(client, test_user, db_session):
    """Test response includes coordinates when fetching a transport"""
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

    transport = models.TripTransport(
        trip_id=trip.id,
        transport_type="drive",
        origin="LA",
        destination="SF",
        origin_latitude=34.0522,
        origin_longitude=-118.2437,
        destination_latitude=37.7749,
        destination_longitude=-122.4194,
    )
    db.add(transport)
    db.commit()
    db.refresh(transport)

    resp = client.get(f"/transport/{transport.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["origin_latitude"] == 34.0522
    assert data["destination_latitude"] == 37.7749
