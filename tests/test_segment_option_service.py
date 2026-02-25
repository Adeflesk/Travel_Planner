"""
Unit tests for app.services.segment_option_service
"""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.schemas.segment_option import SegmentOptionCreate, SegmentOptionUpdate
from app.services.segment_option_service import (
    create_segment_option,
    get_segment_options,
    get_segment_option,
    update_segment_option,
    delete_segment_option,
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


def test_create_segment_option_success():
    """Test creating a segment option"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            budget=Decimal("1000.00"),
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

        # Create option
        option_data = SegmentOptionCreate(
            segment_id=segment.id,
            name="Airlink Express",
            provider="Dublin Bus",
            frequency="Every 15 min",
            estimated_duration=30,
            cost=Decimal("7.50"),
            currency="EUR",
            status="researching",
        )

        option = create_segment_option(option_data, db)

        assert option.id is not None
        assert option.segment_id == segment.id
        assert option.name == "Airlink Express"
        assert option.provider == "Dublin Bus"
        assert option.frequency == "Every 15 min"
        assert option.estimated_duration == 30
        assert float(option.cost) == 7.5
        assert option.currency == "EUR"
        assert option.status == "researching"
    finally:
        db.close()


def test_create_segment_option_nonexistent_segment():
    """Test creating option for nonexistent segment raises error"""
    db = TestingSessionLocal()
    try:
        option_data = SegmentOptionCreate(
            segment_id=999,
            name="Test Option",
        )

        try:
            create_segment_option(option_data, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Journey segment not found" in str(e)
    finally:
        db.close()


def test_get_segment_options():
    """Test retrieving all options for a segment"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
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

        # Create multiple options
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

        options = get_segment_options(segment.id, db)

        assert len(options) == 2
        assert options[0].name == "Option A"
        assert options[1].name == "Option B"
    finally:
        db.close()


def test_get_segment_option():
    """Test retrieving a single segment option"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
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

        db_option = models.SegmentOption(
            segment_id=segment.id,
            name="Test Option",
            provider="Test Provider",
        )
        db.add(db_option)
        db.commit()
        db.refresh(db_option)

        option = get_segment_option(db_option.id, db)

        assert option is not None
        assert option.id == db_option.id
        assert option.name == "Test Option"
        assert option.provider == "Test Provider"
    finally:
        db.close()


def test_update_segment_option():
    """Test updating a segment option"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
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

        db_option = models.SegmentOption(
            segment_id=segment.id,
            name="Original Name",
            status="researching",
        )
        db.add(db_option)
        db.commit()
        db.refresh(db_option)

        # Update option
        update_data = SegmentOptionUpdate(
            name="Updated Name",
            status="selected",
            cost=Decimal("20.00"),
        )

        updated = update_segment_option(db_option.id, update_data, db)

        assert updated.name == "Updated Name"
        assert updated.status == "selected"
        assert float(updated.cost) == 20.0
    finally:
        db.close()


def test_update_segment_option_nonexistent():
    """Test updating nonexistent option raises error"""
    db = TestingSessionLocal()
    try:
        update_data = SegmentOptionUpdate(name="Test")

        try:
            update_segment_option(999, update_data, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Segment option not found" in str(e)
    finally:
        db.close()


def test_delete_segment_option():
    """Test deleting a segment option"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
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

        db_option = models.SegmentOption(
            segment_id=segment.id,
            name="To Delete",
        )
        db.add(db_option)
        db.commit()
        db.refresh(db_option)

        # Delete
        result = delete_segment_option(db_option.id, db)

        assert result is True

        # Verify deleted
        deleted = get_segment_option(db_option.id, db)
        assert deleted is None
    finally:
        db.close()


def test_delete_segment_option_nonexistent():
    """Test deleting nonexistent option raises error"""
    db = TestingSessionLocal()
    try:
        try:
            delete_segment_option(999, db)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Segment option not found" in str(e)
    finally:
        db.close()


def test_segment_option_ordering():
    """Test segment options are returned in correct order"""
    db = TestingSessionLocal()
    try:
        # Create test data
        trip = models.Trip(
            name="Test Trip",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
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

        # Create options in reverse order
        option3 = models.SegmentOption(segment_id=segment.id, name="Third", order=2)
        option1 = models.SegmentOption(segment_id=segment.id, name="First", order=0)
        option2 = models.SegmentOption(segment_id=segment.id, name="Second", order=1)

        db.add_all([option3, option1, option2])
        db.commit()

        options = get_segment_options(segment.id, db)

        assert len(options) == 3
        assert options[0].name == "First"
        assert options[1].name == "Second"
        assert options[2].name == "Third"
    finally:
        db.close()
