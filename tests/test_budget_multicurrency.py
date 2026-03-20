"""
tests/test_budget_multicurrency.py

Tests that budget calculations use base_amount for multi-currency support.
"""
from datetime import date
from decimal import Decimal

from app import models
from app.services.budget_service import get_budget_status, check_expense_impact


def _create_user(db):
    """Create a test user and return its ID."""
    user = models.User(
        email="budget_test@example.com",
        hashed_password="x",
        full_name="Budget Tester",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def test_budget_status_sums_base_amount(db_session):
    """Budget totals should use base_amount, not amount."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Multi-currency trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("1000.00"),
        default_currency="USD",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    # EUR expense: 50 EUR at rate 1.08 = 54.00 USD base_amount
    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
        booked=True,
    )
    # USD expense: 100 USD at rate 1.0 = 100.00 USD base_amount
    e2 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("100.00"),
        currency="USD",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("100.00"),
        date=date.today(),
        booked=False,
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    # Total should be 54 + 100 = 154 (base_amount), NOT 50 + 100 = 150 (amount)
    assert result.total_spent == Decimal("154.00")
    assert result.base_currency == "USD"


def test_budget_status_returns_base_currency(db_session):
    """BudgetStatusResponse includes the trip's base currency."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="EUR trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("500.00"),
        default_currency="EUR",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    assert result.base_currency == "EUR"


def test_budget_status_falls_back_to_usd(db_session):
    """If trip has no default_currency, fall back to USD."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="No currency trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("500.00"),
        default_currency=None,
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    assert result.base_currency == "USD"


def test_check_expense_impact_uses_base_amount(db_session):
    """check_expense_impact should sum base_amount, not amount."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Impact test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("200.00"),
        default_currency="USD",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
    )
    db_session.add(e1)
    db_session.commit()

    # 54 + 150 = 204 > 200 budget → would_exceed
    impact = check_expense_impact(trip.id, Decimal("150.00"), db_session)
    assert impact is not None
    assert impact["would_exceed"] is True


def test_alerts_use_currency_code_not_symbol(db_session):
    """Alert messages use ISO codes like '10.00 EUR', not '$'."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Alert test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("100.00"),
        default_currency="EUR",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("110.00"),
        currency="EUR",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("110.00"),
        date=date.today(),
    )
    db_session.add(e1)
    db_session.commit()

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    over_alerts = [a for a in result.alerts if a.type == "over_budget"]
    assert len(over_alerts) == 1
    assert "EUR" in over_alerts[0].message
    assert "$" not in over_alerts[0].message
