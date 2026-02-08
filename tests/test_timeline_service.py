"""
Unit tests for app.services.timeline_service
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.timeline_service import get_timeline, get_accommodation_expenses


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


def test_get_timeline_empty():
    """Test timeline with no destinations or journeys"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        timeline = get_timeline(trip.id, db)

        assert timeline == []
    finally:
        db.close()


def test_get_timeline_with_destinations():
    """Test timeline merges and sorts destinations"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        # Create destinations with different arrival dates
        dest1 = models.Destination(
            trip_id=trip.id, name="Paris", arrival_date=date.today(), order=0
        )
        dest2 = models.Destination(
            trip_id=trip.id,
            name="London",
            arrival_date=date.today() + timedelta(days=3),
            order=1,
        )
        db.add_all([dest1, dest2])
        db.commit()

        timeline = get_timeline(trip.id, db)

        assert len(timeline) == 2
        assert timeline[0]["type"] == "destination"
        assert timeline[0]["destination"].name == "Paris"
        assert timeline[1]["type"] == "destination"
        assert timeline[1]["destination"].name == "London"
    finally:
        db.close()


def test_get_timeline_with_journeys():
    """Test timeline includes journeys"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        dest1 = models.Destination(trip_id=trip.id, name="Paris", order=0)
        dest2 = models.Destination(trip_id=trip.id, name="London", order=1)
        db.add_all([dest1, dest2])
        db.commit()
        db.refresh(dest1)
        db.refresh(dest2)

        journey = models.Journey(
            trip_id=trip.id,
            origin_id=dest1.id,
            destination_id=dest2.id,
            transport_mode="train",
            departure_datetime=datetime.now() + timedelta(days=1),
        )
        db.add(journey)
        db.commit()

        timeline = get_timeline(trip.id, db)

        assert len(timeline) == 3
        journey_items = [t for t in timeline if t["type"] == "journey"]
        assert len(journey_items) == 1
        assert journey_items[0]["journey"].transport_mode == "train"
    finally:
        db.close()


def test_get_timeline_nonexistent_trip():
    """Test get_timeline returns None for nonexistent trip"""
    db = TestingSessionLocal()
    try:
        timeline = get_timeline(999, db)
        assert timeline is None
    finally:
        db.close()


def test_get_accommodation_expenses_empty():
    """Test accommodation expenses with no destinations"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        result = get_accommodation_expenses(trip.id, db)

        assert result == []
    finally:
        db.close()


def test_get_accommodation_expenses_manual_link():
    """Test accommodation expenses with manual destination link"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        dest = models.Destination(
            trip_id=trip.id,
            name="Paris",
            arrival_date=date.today(),
            departure_date=date.today() + timedelta(days=3),
            order=0,
        )
        db.add(dest)
        db.commit()
        db.refresh(dest)

        # Create accommodation expense linked to destination
        expense = models.Expense(
            trip_id=trip.id,
            destination_id=dest.id,
            category="accommodation",
            amount=Decimal("150.00"),
            date=date.today(),
            currency="USD",
            booked=True,
            paid=False,
        )
        db.add(expense)
        db.commit()

        result = get_accommodation_expenses(trip.id, db)

        assert len(result) == 1
        assert result[0]["destination"].name == "Paris"
        assert len(result[0]["expenses"]) == 1
        assert result[0]["total"] == 150.0
    finally:
        db.close()


def test_get_accommodation_expenses_auto_link_by_date():
    """Test accommodation expenses auto-linked by date range"""
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        dest = models.Destination(
            trip_id=trip.id,
            name="London",
            arrival_date=date.today(),
            departure_date=date.today() + timedelta(days=3),
            order=0,
        )
        db.add(dest)
        db.commit()
        db.refresh(dest)

        # Create accommodation expense without destination_id but within date range
        expense = models.Expense(
            trip_id=trip.id,
            category="accommodation",
            amount=Decimal("200.00"),
            date=date.today() + timedelta(days=1),
            currency="USD",
            booked=False,
            paid=False,
        )
        db.add(expense)
        db.commit()

        result = get_accommodation_expenses(trip.id, db)

        assert len(result) == 1
        assert result[0]["destination"].name == "London"
        assert len(result[0]["expenses"]) == 1
        assert result[0]["total"] == 200.0
    finally:
        db.close()


def test_get_accommodation_expenses_nonexistent_trip():
    """Test accommodation expenses returns None for nonexistent trip"""
    db = TestingSessionLocal()
    try:
        result = get_accommodation_expenses(999, db)
        assert result is None
    finally:
        db.close()
