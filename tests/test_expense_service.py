from decimal import Decimal
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.expense_service import get_expense_summary


SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_function():
    models.Base.metadata.create_all(bind=engine)


def teardown_function():
    models.Base.metadata.drop_all(bind=engine)


def test_get_expense_summary():
    db = TestingSessionLocal()
    try:
        # create a trip
        trip = models.Trip(
            name="S Test",
            description="t",
            start_date=date.today(),
            end_date=date.today(),
            budget=Decimal("1000.00"),
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        # add expenses
        e1 = models.Expense(
            trip_id=trip.id,
            category="food",
            amount=Decimal("10.00"),
            date=date.today(),
            currency="USD",
            booked=False,
            paid=True,
        )
        e2 = models.Expense(
            trip_id=trip.id,
            category="lodging",
            amount=Decimal("25.50"),
            date=date.today(),
            currency="USD",
            booked=True,
            paid=False,
        )
        db.add_all([e1, e2])
        db.commit()

        summary = get_expense_summary(trip.id, db)

        assert summary["total"] == 35.5
        assert summary["paid_total"] == 10.0
        assert summary["unpaid_total"] == 25.5
        assert summary["count"] == 2
        assert summary["by_category"]["food"] == 10.0
        assert summary["by_category"]["lodging"] == 25.5
    finally:
        db.close()
