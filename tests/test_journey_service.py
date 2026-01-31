"""
Unit tests for app.services.journey_service
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.schemas.journey import JourneyCreate, JourneyUpdate
from app.services.journey_service import (
    create_journey,
    get_trip_journeys,
    get_journey,
    update_journey,
    delete_journey,
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


def test_create_journey_success():
    """Test creating a journey with valid trip"""
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

        journey_data = JourneyCreate(
            trip_id=trip.id,
            transport_mode="train",
            departure_datetime=datetime.now() + timedelta(days=1),
            arrival_datetime=datetime.now() + timedelta(days=1, hours=4),
        )

        journey = create_journey(journey_data, db)

        assert journey.id is not None
        assert journey.trip_id == trip.id
        assert journey.transport_mode == "train"
    finally:
        db.close()


def test_create_journey_nonexistent_trip():
    """Test creating a journey with nonexistent trip raises error"""
    db = TestingSessionLocal()
    try:
        journey_data = JourneyCreate(
            trip_id=999,
            transport_mode="flight",
        )

        try:
            create_journey(journey_data, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Trip not found" in str(e)
    finally:
        db.close()


def test_create_journey_with_destinations():
    """Test creating a journey with origin and destination"""
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

        journey_data = JourneyCreate(
            trip_id=trip.id,
            origin_id=dest1.id,
            destination_id=dest2.id,
            transport_mode="train",
        )

        journey = create_journey(journey_data, db)

        assert journey.origin_id == dest1.id
        assert journey.destination_id == dest2.id
    finally:
        db.close()


def test_get_trip_journeys():
    """Test retrieving journeys for a trip"""
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

        # Create multiple journeys
        for mode in ["flight", "train", "bus"]:
            journey = models.Journey(
                trip_id=trip.id,
                transport_mode=mode,
            )
            db.add(journey)
        db.commit()

        journeys = get_trip_journeys(trip.id, db)

        assert len(journeys) == 3
        modes = [j.transport_mode for j in journeys]
        assert "flight" in modes
        assert "train" in modes
        assert "bus" in modes
    finally:
        db.close()


def test_get_journey():
    """Test retrieving a specific journey"""
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

        journey = models.Journey(
            trip_id=trip.id,
            transport_mode="ferry",
            carrier="P&O Ferries",
        )
        db.add(journey)
        db.commit()
        db.refresh(journey)

        retrieved = get_journey(journey.id, db)

        assert retrieved is not None
        assert retrieved.id == journey.id
        assert retrieved.transport_mode == "ferry"
        assert retrieved.carrier == "P&O Ferries"
    finally:
        db.close()


def test_get_journey_nonexistent():
    """Test retrieving nonexistent journey returns None"""
    db = TestingSessionLocal()
    try:
        journey = get_journey(999, db)
        assert journey is None
    finally:
        db.close()


def test_update_journey():
    """Test updating a journey"""
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

        journey = models.Journey(
            trip_id=trip.id,
            transport_mode="flight",
            status="planned",
        )
        db.add(journey)
        db.commit()
        db.refresh(journey)

        update_data = JourneyUpdate(
            carrier="British Airways",
            booking_reference="BA456",
            cost=Decimal("350.00"),
            status="booked",
        )

        updated = update_journey(journey.id, update_data, db)

        assert updated.carrier == "British Airways"
        assert updated.booking_reference == "BA456"
        assert updated.status == "booked"
    finally:
        db.close()


def test_update_journey_nonexistent():
    """Test updating nonexistent journey raises error"""
    db = TestingSessionLocal()
    try:
        update_data = JourneyUpdate(carrier="Test Carrier")

        try:
            update_journey(999, update_data, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Journey not found" in str(e)
    finally:
        db.close()


def test_delete_journey():
    """Test deleting a journey"""
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

        journey = models.Journey(
            trip_id=trip.id,
            transport_mode="car",
        )
        db.add(journey)
        db.commit()
        db.refresh(journey)
        journey_id = journey.id

        # Delete it
        result = delete_journey(journey_id, db)

        assert result is True

        # Verify it's deleted
        deleted = get_journey(journey_id, db)
        assert deleted is None
    finally:
        db.close()


def test_delete_journey_nonexistent():
    """Test deleting nonexistent journey raises error"""
    db = TestingSessionLocal()
    try:
        try:
            delete_journey(999, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Journey not found" in str(e)
    finally:
        db.close()
