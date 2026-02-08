from datetime import date
from unittest.mock import patch

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


def test_create_destination(client, test_user, db_session):
    """Test creating a destination"""
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
        "arrival_date": "2030-01-01",
        "departure_date": "2030-01-05",
        "trip_id": trip.id,
    }
    resp = client.post("/destinations/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Paris"
    assert data["trip_id"] == trip.id


def test_create_destination_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot create destination"""
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

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    payload = {
        "name": "Rome",
        "country": "Italy",
        "arrival_date": "2030-01-05",
        "departure_date": "2030-01-10",
        "trip_id": trip.id,
    }
    resp = client.post("/destinations/", json=payload)
    assert resp.status_code == 404


def test_get_trip_destinations(client, test_user, db_session):
    """Test listing destinations for a trip"""
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

    dest1 = models.Destination(
        name="Paris",
        trip_id=trip.id,
        country="France",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
        order=1,
    )
    dest2 = models.Destination(
        name="London",
        trip_id=trip.id,
        country="UK",
        arrival_date=date(2030, 1, 5),
        departure_date=date(2030, 1, 10),
        order=2,
    )
    db.add_all([dest1, dest2])
    db.commit()

    resp = client.get(f"/trips/{trip.id}/destinations/")
    assert resp.status_code == 200
    destinations = resp.json()
    assert len(destinations) == 2
    assert destinations[0]["name"] == "Paris"
    assert destinations[1]["name"] == "London"


def test_get_trip_destinations_shared(client, test_user, db_session):
    """Test reading destinations on shared trip"""
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
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.get(f"/trips/{trip.id}/destinations/")
    assert resp.status_code == 200
    destinations = resp.json()
    assert len(destinations) == 1


def test_get_trip_destinations_not_found(client, test_user):
    """Test 404 for non-existent trip"""
    resp = client.get("/trips/99999/destinations/")
    assert resp.status_code == 404


def test_get_destination(client, test_user, db_session):
    """Test getting a single destination"""
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
        name="Berlin",
        trip_id=trip.id,
        country="Germany",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    resp = client.get(f"/destinations/{dest.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Berlin"


def test_get_destination_shared(client, test_user, db_session):
    """Test reading destination on shared trip"""
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
        name="Amsterdam",
        trip_id=trip.id,
        country="Netherlands",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()
    db.refresh(dest)

    resp = client.get(f"/destinations/{dest.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Amsterdam"


def test_get_destination_not_found(client, test_user):
    """Test 404 for non-existent destination"""
    resp = client.get("/destinations/99999")
    assert resp.status_code == 404


def test_update_destination(client, test_user, db_session):
    """Test updating a destination"""
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
        name="Venice",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    payload = {"name": "Venice (City of Canals)"}
    resp = client.put(f"/destinations/{dest.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Venice (City of Canals)"


def test_update_destination_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot update destination"""
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
        name="Milan",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()
    db.refresh(dest)

    payload = {"name": "Milan (Fashion Capital)"}
    resp = client.put(f"/destinations/{dest.id}", json=payload)
    assert resp.status_code == 404


def test_update_destination_not_found(client, test_user):
    """Test 404 for updating non-existent destination"""
    payload = {"name": "Update"}
    resp = client.put("/destinations/99999", json=payload)
    assert resp.status_code == 404


def test_delete_destination(client, test_user, db_session):
    """Test deleting a destination"""
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
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)
    dest_id = dest.id

    resp = client.delete(f"/destinations/{dest_id}")
    assert resp.status_code == 204

    # Verify deleted
    deleted_dest = (
        db.query(models.Destination).filter(models.Destination.id == dest_id).first()
    )
    assert deleted_dest is None


def test_delete_destination_non_owner_forbidden(client, test_user, db_session):
    """Test non-owner cannot delete destination"""
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
        name="Florence",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 10),
    )
    db.add(dest)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.delete(f"/destinations/{dest.id}")
    assert resp.status_code == 404


def test_delete_destination_not_found(client, test_user):
    """Test 404 for deleting non-existent destination"""
    resp = client.delete("/destinations/99999")
    assert resp.status_code == 404


# Weather endpoint tests
@patch("app.services.weather_service.fetch_weather")
def test_get_destination_weather_success(mock_fetch, client, test_user, db_session):
    """Test getting weather for a destination"""
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
        name="Paris",
        trip_id=trip.id,
        country="France",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Mock weather service response
    mock_weather = {
        "location": "Paris, France",
        "current": {
            "date": "2030-01-01",
            "temp_high_f": 50,
            "temp_low_f": 40,
            "temp_high_c": 10,
            "temp_low_c": 4.4,
            "condition": "clear",
            "description": "clear sky",
            "precipitation_chance": 10,
            "humidity": 65,
            "wind_speed_mph": 5,
            "wind_speed_kmh": 8,
            "icon": "01d",
        },
        "forecast": [],
        "packing_suggestions": ["Light jacket"],
        "cached": False,
    }
    mock_fetch.return_value = mock_weather

    resp = client.get(f"/destinations/{dest.id}/weather")
    assert resp.status_code == 200
    data = resp.json()
    assert data["location"] == "Paris, France"
    assert data["current"]["temp_high_f"] == 50
    assert "packing_suggestions" in data


@patch("app.services.weather_service.fetch_weather")
def test_get_destination_weather_not_found(mock_fetch, client, test_user):
    """Test 404 for weather of non-existent destination"""
    resp = client.get("/destinations/99999/weather")
    assert resp.status_code == 404


@patch("app.services.weather_service.fetch_weather")
def test_get_destination_weather_unauthorized(
    mock_fetch, client, test_user, db_session
):
    """Test weather endpoint requires access to trip"""
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
        name="London",
        trip_id=trip.id,
        country="UK",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # User doesn't have access to trip
    resp = client.get(f"/destinations/{dest.id}/weather")
    assert resp.status_code == 404  # Returns 404 to avoid leaking trip existence


@patch("app.services.weather_service.fetch_weather")
def test_get_destination_weather_shared_trip(mock_fetch, client, test_user, db_session):
    """Test getting weather for destination on shared trip"""
    db = db_session

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="SharedTrip",
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

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

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

    mock_weather = {
        "location": "Rome, Italy",
        "current": None,
        "forecast": [],
        "packing_suggestions": [],
        "cached": False,
    }
    mock_fetch.return_value = mock_weather

    # Shared user can view weather
    resp = client.get(f"/destinations/{dest.id}/weather")
    assert resp.status_code == 200
    data = resp.json()
    assert data["location"] == "Rome, Italy"


@patch("app.services.weather_service.fetch_weather")
def test_get_destination_weather_service_unavailable(
    mock_fetch, client, test_user, db_session
):
    """Test 503 when weather service is unavailable"""
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
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Mock weather service returning None (unavailable)
    mock_fetch.return_value = None

    resp = client.get(f"/destinations/{dest.id}/weather")
    assert resp.status_code == 503
    data = resp.json()
    assert "temporarily unavailable" in data["detail"].lower()
