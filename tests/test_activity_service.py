"""
Unit tests for app.services.activity_service
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.activity_service import (
    get_trip_progress,
    get_destinations_with_activities,
)


SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_function():
    models.Base.metadata.create_all(bind=engine)


def teardown_function():
    models.Base.metadata.drop_all(bind=engine)


def test_get_trip_progress_no_activities():
    """Test trip progress returns 0 when no activities exist"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        progress = get_trip_progress(trip.id, db)

        assert progress is not None
        assert progress["total_activities"] == 0
        assert progress["completed_activities"] == 0
        assert progress["progress_percent"] == 0
    finally:
        db.close()


def test_get_trip_progress_with_activities():
    """Test trip progress calculates correctly with mixed completed/incomplete activities"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        dest = models.Destination(trip_id=trip.id, name="Paris")
        db.add(dest)
        db.commit()
        db.refresh(dest)

        # Add 4 activities: 3 completed, 1 incomplete
        activities = [
            models.Activity(
                destination_id=dest.id, name="Visit Eiffel Tower", is_completed=True
            ),
            models.Activity(
                destination_id=dest.id, name="Visit Louvre", is_completed=True
            ),
            models.Activity(
                destination_id=dest.id, name="Seine Cruise", is_completed=True
            ),
            models.Activity(
                destination_id=dest.id, name="Montmartre", is_completed=False
            ),
        ]
        db.add_all(activities)
        db.commit()

        progress = get_trip_progress(trip.id, db)

        assert progress["total_activities"] == 4
        assert progress["completed_activities"] == 3
        assert progress["progress_percent"] == 75
    finally:
        db.close()


def test_get_trip_progress_nonexistent_trip():
    """Test get_trip_progress returns None for nonexistent trip"""
    db = TestingSessionLocal()
    try:
        progress = get_trip_progress(999, db)
        assert progress is None
    finally:
        db.close()


def test_get_destinations_with_activities_empty():
    """Test destinations with activities returns empty list when no destinations"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        result = get_destinations_with_activities(trip.id, db)

        assert result == []
    finally:
        db.close()


def test_get_destinations_with_activities_nested():
    """Test destinations with activities returns properly nested structure"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        # Create 2 destinations
        dest1 = models.Destination(trip_id=trip.id, name="Paris", order=0)
        dest2 = models.Destination(trip_id=trip.id, name="London", order=1)
        db.add_all([dest1, dest2])
        db.commit()
        db.refresh(dest1)
        db.refresh(dest2)

        # Add activities to each destination
        act1 = models.Activity(destination_id=dest1.id, name="Eiffel Tower")
        act2 = models.Activity(destination_id=dest1.id, name="Louvre")
        act3 = models.Activity(destination_id=dest2.id, name="Big Ben")
        db.add_all([act1, act2, act3])
        db.commit()

        result = get_destinations_with_activities(trip.id, db)

        assert len(result) == 2
        assert result[0]["destination"].name == "Paris"
        assert len(result[0]["activities"]) == 2
        assert result[1]["destination"].name == "London"
        assert len(result[1]["activities"]) == 1
    finally:
        db.close()


def test_get_destinations_with_activities_nonexistent_trip():
    """Test get_destinations_with_activities returns None for nonexistent trip"""
    db = TestingSessionLocal()
    try:
        result = get_destinations_with_activities(999, db)
        assert result is None
    finally:
        db.close()
