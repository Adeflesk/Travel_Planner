"""
Unit tests for app.services.activity_service (unified DayActivity model)
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
    models.Base.metadata.create_all(bind=engine)


def _make_trip(db):
    trip = models.Trip(
        name="Test Trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("1000.00"),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_get_trip_progress_no_activities():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        progress = get_trip_progress(trip.id, db)
        assert progress == {
            "total_activities": 0,
            "completed_activities": 0,
            "progress_percent": 0,
        }
    finally:
        db.close()


def test_get_trip_progress_with_activities():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        dest = models.Destination(trip_id=trip.id, name="Paris")
        db.add(dest)
        db.commit()
        db.refresh(dest)

        db.add_all(
            [
                models.DayActivity(
                    destination_id=dest.id, title="Eiffel Tower", is_completed=True
                ),
                models.DayActivity(
                    destination_id=dest.id, title="Louvre", is_completed=True
                ),
                models.DayActivity(
                    destination_id=dest.id, title="Montmartre", is_completed=False
                ),
            ]
        )
        db.commit()

        progress = get_trip_progress(trip.id, db)
        assert progress["total_activities"] == 3
        assert progress["completed_activities"] == 2
        assert progress["progress_percent"] == 67
    finally:
        db.close()


def test_get_trip_progress_nonexistent_trip():
    db = TestingSessionLocal()
    try:
        assert get_trip_progress(999, db) is None
    finally:
        db.close()


def test_get_destinations_with_activities_empty():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        result = get_destinations_with_activities(trip.id, db)
        assert result == []
    finally:
        db.close()


def test_get_destinations_with_activities_nested():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        dest1 = models.Destination(trip_id=trip.id, name="Paris", order=0)
        dest2 = models.Destination(trip_id=trip.id, name="London", order=1)
        db.add_all([dest1, dest2])
        db.commit()
        db.refresh(dest1)
        db.refresh(dest2)

        db.add_all(
            [
                models.DayActivity(destination_id=dest1.id, title="Eiffel Tower"),
                models.DayActivity(destination_id=dest1.id, title="Louvre"),
                models.DayActivity(destination_id=dest2.id, title="Big Ben"),
            ]
        )
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
    db = TestingSessionLocal()
    try:
        assert get_destinations_with_activities(999, db) is None
    finally:
        db.close()
