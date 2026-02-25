"""
Unit tests for segment options router
"""
from datetime import date
from decimal import Decimal

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


def test_create_segment_option(client, test_user, db_session):
    """Test creating a segment option"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(
        trip_id=trip.id,
        transport_mode="bus",
        order=0,
    )
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    payload = {
        "segment_id": segment.id,
        "name": "Airlink Express",
        "provider": "Dublin Bus",
        "frequency": "Every 15 min",
        "estimated_duration": 30,
        "cost": 7.50,
        "currency": "EUR",
        "status": "researching",
    }

    resp = client.post("/segment-options/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Airlink Express"
    assert data["provider"] == "Dublin Bus"
    assert data["frequency"] == "Every 15 min"
    assert data["estimated_duration"] == 30
    assert float(data["cost"]) == 7.5
    assert data["currency"] == "EUR"
    assert data["status"] == "researching"


def test_create_segment_option_nonexistent_segment(client, test_user):
    """Test creating option for nonexistent segment returns 404"""
    payload = {
        "segment_id": 999,
        "name": "Test Option",
    }

    resp = client.post("/segment-options/", json=payload)
    assert resp.status_code == 404


def test_get_segment_options(client, test_user, db_session):
    """Test getting all options for a segment"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    option1 = models.SegmentOption(
        segment_id=segment.id,
        name="Option A",
        cost=Decimal("10.00"),
        order=0,
    )
    option2 = models.SegmentOption(
        segment_id=segment.id,
        name="Option B",
        cost=Decimal("15.00"),
        order=1,
    )
    db.add_all([option1, option2])
    db.commit()

    resp = client.get(f"/segment-options/segment/{segment.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["name"] == "Option A"
    assert data[1]["name"] == "Option B"


def test_get_segment_option(client, test_user, db_session):
    """Test getting a single segment option"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    option = models.SegmentOption(
        segment_id=segment.id,
        name="Test Option",
        provider="Test Provider",
    )
    db.add(option)
    db.commit()
    db.refresh(option)

    resp = client.get(f"/segment-options/{option.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == option.id
    assert data["name"] == "Test Option"
    assert data["provider"] == "Test Provider"


def test_get_nonexistent_segment_option(client, test_user):
    """Test getting nonexistent option returns 404"""
    resp = client.get("/segment-options/999")
    assert resp.status_code == 404


def test_update_segment_option(client, test_user, db_session):
    """Test updating a segment option"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    option = models.SegmentOption(
        segment_id=segment.id,
        name="Original Name",
        status="researching",
    )
    db.add(option)
    db.commit()
    db.refresh(option)

    payload = {
        "name": "Updated Name",
        "status": "selected",
        "cost": 20.00,
    }

    resp = client.put(f"/segment-options/{option.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Name"
    assert data["status"] == "selected"
    assert float(data["cost"]) == 20.0


def test_update_nonexistent_segment_option(client, test_user):
    """Test updating nonexistent option returns 404"""
    payload = {"name": "Test"}
    resp = client.put("/segment-options/999", json=payload)
    assert resp.status_code == 404


def test_delete_segment_option(client, test_user, db_session):
    """Test deleting a segment option"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    option = models.SegmentOption(
        segment_id=segment.id,
        name="To Delete",
    )
    db.add(option)
    db.commit()
    db.refresh(option)

    resp = client.delete(f"/segment-options/{option.id}")
    assert resp.status_code == 204

    # Verify deleted
    get_resp = client.get(f"/segment-options/{option.id}")
    assert get_resp.status_code == 404


def test_delete_nonexistent_segment_option(client, test_user):
    """Test deleting nonexistent option returns 404"""
    resp = client.delete("/segment-options/999")
    assert resp.status_code == 404


def test_segment_option_status_transitions(client, test_user, db_session):
    """Test status transitions from researching -> selected -> booked"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    option = models.SegmentOption(
        segment_id=segment.id,
        name="Test Option",
        status="researching",
    )
    db.add(option)
    db.commit()
    db.refresh(option)

    # Mark as selected
    resp = client.put(f"/segment-options/{option.id}", json={"status": "selected"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "selected"

    # Mark as booked
    resp = client.put(f"/segment-options/{option.id}", json={"status": "booked"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "booked"


def test_segment_option_with_booking_url(client, test_user, db_session):
    """Test creating option with booking URL"""
    db = db_session

    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()

    journey = models.Journey(trip_id=trip.id, transport_mode="bus", order=0)
    db.add(journey)
    db.commit()

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Airport",
        destination_name="Hotel",
        order=0,
    )
    db.add(segment)
    db.commit()

    payload = {
        "segment_id": segment.id,
        "name": "Airport Shuttle",
        "booking_url": "https://example.com/book",
        "notes": "Book 24h in advance",
    }

    resp = client.post("/segment-options/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["booking_url"] == "https://example.com/book"
    assert data["notes"] == "Book 24h in advance"
