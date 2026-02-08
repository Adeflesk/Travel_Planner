"""
Unit tests for app.services.packing_service
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.packing_service import get_packing_summary


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


def test_get_packing_summary_empty():
    """Test packing summary with no items"""
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

        summary = get_packing_summary(trip.id, db)

        assert summary["total_items"] == 0
        assert summary["packed_items"] == 0
        assert summary["progress_percent"] == 0
        assert summary["by_category"] == {}
    finally:
        db.close()


def test_get_packing_summary_with_items():
    """Test packing summary with multiple items across categories"""
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

        # Add packing items
        items = [
            models.PackingItem(
                trip_id=trip.id,
                item_name="T-Shirt",
                category="clothing",
                is_packed=True,
            ),
            models.PackingItem(
                trip_id=trip.id, item_name="Jeans", category="clothing", is_packed=False
            ),
            models.PackingItem(
                trip_id=trip.id,
                item_name="Passport",
                category="documents",
                is_packed=True,
            ),
            models.PackingItem(
                trip_id=trip.id,
                item_name="Toothbrush",
                category="toiletries",
                is_packed=False,
            ),
        ]
        db.add_all(items)
        db.commit()

        summary = get_packing_summary(trip.id, db)

        assert summary["total_items"] == 4
        assert summary["packed_items"] == 2
        assert summary["progress_percent"] == 50

        # Check category breakdown
        assert "clothing" in summary["by_category"]
        assert summary["by_category"]["clothing"]["total"] == 2
        assert summary["by_category"]["clothing"]["packed"] == 1

        assert "documents" in summary["by_category"]
        assert summary["by_category"]["documents"]["total"] == 1
        assert summary["by_category"]["documents"]["packed"] == 1

        assert "toiletries" in summary["by_category"]
        assert summary["by_category"]["toiletries"]["total"] == 1
        assert summary["by_category"]["toiletries"]["packed"] == 0
    finally:
        db.close()


def test_get_packing_summary_all_packed():
    """Test packing summary when all items are packed"""
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

        # Add only packed items
        items = [
            models.PackingItem(
                trip_id=trip.id, item_name="Item 1", category="clothing", is_packed=True
            ),
            models.PackingItem(
                trip_id=trip.id, item_name="Item 2", category="clothing", is_packed=True
            ),
            models.PackingItem(
                trip_id=trip.id,
                item_name="Item 3",
                category="documents",
                is_packed=True,
            ),
        ]
        db.add_all(items)
        db.commit()

        summary = get_packing_summary(trip.id, db)

        assert summary["total_items"] == 3
        assert summary["packed_items"] == 3
        assert summary["progress_percent"] == 100
    finally:
        db.close()


def test_get_packing_summary_nonexistent_trip():
    """Test packing summary returns None for nonexistent trip"""
    db = TestingSessionLocal()
    try:
        summary = get_packing_summary(999, db)
        assert summary is None
    finally:
        db.close()


def test_get_packing_summary_items_without_category():
    """Test packing summary groups items without category as 'other'"""
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

        # Add item without category
        item = models.PackingItem(
            trip_id=trip.id, item_name="Misc Item", category=None, is_packed=False
        )
        db.add(item)
        db.commit()

        summary = get_packing_summary(trip.id, db)

        assert "other" in summary["by_category"]
        assert summary["by_category"]["other"]["total"] == 1
        assert summary["by_category"]["other"]["packed"] == 0
    finally:
        db.close()
