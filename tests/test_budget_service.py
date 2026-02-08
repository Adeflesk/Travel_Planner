from decimal import Decimal
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.budget_service import get_budget_status


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


def test_get_budget_status_totals_and_breakdown():
    db = TestingSessionLocal()
    try:
        trip = models.Trip(
            name="Budget Test",
            description="t",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("100.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        e1 = models.Expense(
            trip_id=trip.id,
            category="food",
            amount=Decimal("30.00"),
            date=date.today(),
            currency="USD",
            booked=True,
            paid=True,
        )
        e2 = models.Expense(
            trip_id=trip.id,
            category="lodging",
            amount=Decimal("20.00"),
            date=date.today(),
            currency="USD",
            booked=False,
            paid=False,
        )
        db.add_all([e1, e2])
        db.commit()

        status = get_budget_status(trip.id, db)

        assert status is not None
        assert status.total_budget == Decimal("100.00")
        assert status.total_spent == Decimal("50.00")
        assert status.booked_amount == Decimal("30.00")
        assert status.estimated_amount == Decimal("20.00")
        assert status.percentage_used == 50.0
        assert status.remaining == Decimal("50.00")
        assert status.status == "normal"
        assert len(status.by_category) == 2
    finally:
        db.close()


def test_get_budget_status_missing_trip_returns_none():
    db = TestingSessionLocal()
    try:
        status = get_budget_status(9999, db)
        assert status is None
    finally:
        db.close()
