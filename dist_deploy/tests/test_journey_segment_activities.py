"""
Tests for journey segment activity and expense endpoints
"""

from datetime import date, datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import models


def test_create_activity_for_segment(
    client: TestClient, test_user, db_session: Session
):
    """Test creating an activity for a journey segment"""
    db = db_session
    user = test_user["user"]

    # Create a trip
    trip = models.Trip(
        user_id=user.id,
        name="Test Road Trip",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 5),
        status="planning",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Create a destination
    dest = models.Destination(
        trip_id=trip.id,
        name="Denver",
        country="USA",
        arrival_date=date(2026, 3, 1),
        departure_date=date(2026, 3, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    # Create a journey
    journey = models.Journey(
        trip_id=trip.id,
        origin_id=dest.id,
        destination_id=dest.id,
        transport_mode="car",
        departure_datetime=datetime(2026, 3, 1, 8, 0),
        arrival_datetime=datetime(2026, 3, 1, 18, 0),
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)

    # Create a STOP segment
    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="STOP",
        destination_name="Glenwood Springs",
        start_datetime=datetime(2026, 3, 1, 10, 0),
        end_datetime=datetime(2026, 3, 1, 11, 0),
        order=1,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Create an activity for the segment
    activity_data = {
        "name": "Lunch at Slope & Hatch",
        "segment_id": segment.id,
        "activity_type": "dining",
        "duration": 60,
        "cost": 25.00,
    }

    response = client.post(
        f"/journey-segments/{segment.id}/activities", json=activity_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Lunch at Slope & Hatch"
    assert data["segment_id"] == segment.id
    assert data["destination_id"] is None  # Transit-only activity
    assert data["duration"] == 60
    assert float(data["cost"]) == 25.00


def test_get_segment_activities(client: TestClient, test_user, db_session: Session):
    """Test getting all activities for a segment"""
    db = db_session
    user = test_user["user"]

    # Create test data
    trip = models.Trip(
        user_id=user.id,
        name="Test Trip",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 5),
        status="planning",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        trip_id=trip.id,
        name="Test",
        country="USA",
        arrival_date=date(2026, 3, 1),
        departure_date=date(2026, 3, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    journey = models.Journey(
        trip_id=trip.id,
        origin_id=dest.id,
        destination_id=dest.id,
        transport_mode="car",
        departure_datetime=datetime(2026, 3, 1, 8, 0),
        arrival_datetime=datetime(2026, 3, 1, 18, 0),
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="STOP",
        destination_name="Rest Stop",
        start_datetime=datetime(2026, 3, 1, 10, 0),
        end_datetime=datetime(2026, 3, 1, 10, 30),
        order=1,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Add multiple activities
    activity1 = models.Activity(
        segment_id=segment.id, name="Activity 1", status="planned"
    )
    activity2 = models.Activity(
        segment_id=segment.id, name="Activity 2", status="planned"
    )
    db.add_all([activity1, activity2])
    db.commit()

    # Get activities
    response = client.get(f"/journey-segments/{segment.id}/activities")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_create_expense_for_segment(client: TestClient, test_user, db_session: Session):
    """Test creating an expense for a journey segment"""
    db = db_session
    user = test_user["user"]

    # Create test data
    trip = models.Trip(
        user_id=user.id,
        name="Test Trip",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 5),
        status="planning",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        trip_id=trip.id,
        name="Test",
        country="USA",
        arrival_date=date(2026, 3, 1),
        departure_date=date(2026, 3, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    journey = models.Journey(
        trip_id=trip.id,
        origin_id=dest.id,
        destination_id=dest.id,
        transport_mode="car",
        departure_datetime=datetime(2026, 3, 1, 8, 0),
        arrival_datetime=datetime(2026, 3, 1, 18, 0),
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="TRANSFER",
        origin_name="Home",
        destination_name="Airport",
        start_datetime=datetime(2026, 3, 1, 6, 0),
        end_datetime=datetime(2026, 3, 1, 7, 0),
        order=0,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Create an expense (Uber ride)
    expense_data = {
        "trip_id": trip.id,
        "segment_id": segment.id,
        "category": "transportation",
        "amount": 45.50,
        "currency": "USD",
        "description": "Uber to Airport",
        "date": "2026-03-01",
    }

    response = client.post(
        f"/journey-segments/{segment.id}/expenses", json=expense_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["segment_id"] == segment.id
    assert data["destination_id"] is None  # Pure transit expense
    assert float(data["amount"]) == 45.50


def test_create_activity_with_both_links(
    client: TestClient, test_user, db_session: Session
):
    """Test creating an activity with both destination_id and segment_id (En Route)"""
    db = db_session
    user = test_user["user"]

    # Create test data
    trip = models.Trip(
        user_id=user.id,
        name="Test Trip",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 5),
        status="planning",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        trip_id=trip.id,
        name="Denver",
        country="USA",
        arrival_date=date(2026, 3, 1),
        departure_date=date(2026, 3, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    journey = models.Journey(
        trip_id=trip.id,
        origin_id=dest.id,
        destination_id=dest.id,
        transport_mode="car",
        departure_datetime=datetime(2026, 3, 1, 8, 0),
        arrival_datetime=datetime(2026, 3, 1, 18, 0),
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)

    segment = models.JourneySegment(
        journey_id=journey.id,
        segment_type="STOP",
        destination_id=dest.id,
        destination_name="Denver",
        start_datetime=datetime(2026, 3, 1, 12, 0),
        end_datetime=datetime(2026, 3, 1, 14, 0),
        order=1,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)

    # Create activity linked to both destination and segment
    activity_data = {
        "name": "Museum Visit",
        "destination_id": dest.id,
        "segment_id": segment.id,
        "activity_type": "sightseeing",
        "duration": 120,
    }

    response = client.post(
        f"/journey-segments/{segment.id}/activities", json=activity_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["destination_id"] == dest.id
    assert data["segment_id"] == segment.id
