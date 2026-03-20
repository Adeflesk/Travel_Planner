"""
tests/test_expense_currency_router.py

Tests for expense creation/update with currency conversion.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from app import models


def _create_trip(db_session, default_currency="USD", budget=1000, user_id=None):
    """Helper to create a trip."""
    trip = models.Trip(
        name="Test Trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal(str(budget)),
        default_currency=default_currency,
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)
    return trip


def test_create_expense_same_currency(client, db_session, test_user):
    """When expense currency matches trip base, rate=1.0 and base_amount=amount."""
    trip = _create_trip(
        db_session, default_currency="USD", user_id=test_user["user"].id
    )

    resp = client.post(
        "/expenses/",
        json={
            "trip_id": trip.id,
            "category": "food",
            "amount": 50.0,
            "currency": "USD",
            "date": str(date.today()),
            "description": "Lunch",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.0
    assert float(data["base_amount"]) == 50.0


def test_create_expense_different_currency_auto_convert(client, db_session, test_user):
    """When currencies differ and no rate provided, fetch rate automatically."""
    trip = _create_trip(
        db_session, default_currency="USD", user_id=test_user["user"].id
    )

    with patch(
        "app.routers.expenses.convert",
        return_value=(Decimal("1.08"), Decimal("54.00")),
    ):
        resp = client.post(
            "/expenses/",
            json={
                "trip_id": trip.id,
                "category": "food",
                "amount": 50.0,
                "currency": "EUR",
                "date": str(date.today()),
                "description": "Dinner in Paris",
            },
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.08
    assert float(data["base_amount"]) == 54.0


def test_create_expense_user_provided_rate(client, db_session, test_user):
    """When user provides exchange_rate, use it instead of fetching."""
    trip = _create_trip(
        db_session, default_currency="USD", user_id=test_user["user"].id
    )

    with patch("app.routers.expenses.convert") as mock_convert:
        resp = client.post(
            "/expenses/",
            json={
                "trip_id": trip.id,
                "category": "food",
                "amount": 50.0,
                "currency": "EUR",
                "exchange_rate": 1.10,
                "date": str(date.today()),
                "description": "Manual rate",
            },
        )
        mock_convert.assert_not_called()

    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.10
    assert float(data["base_amount"]) == 55.0


def test_create_expense_rate_unavailable_no_user_rate(client, db_session, test_user):
    """When rate API fails and no user rate, return 422."""
    trip = _create_trip(
        db_session, default_currency="USD", user_id=test_user["user"].id
    )

    with patch("app.routers.expenses.convert", return_value=None):
        resp = client.post(
            "/expenses/",
            json={
                "trip_id": trip.id,
                "category": "food",
                "amount": 50.0,
                "currency": "EUR",
                "date": str(date.today()),
                "description": "No rate available",
            },
        )

    assert resp.status_code == 422


def test_update_expense_recalculates_on_amount_change(client, db_session, test_user):
    """Updating amount recalculates base_amount using stored rate."""
    trip = _create_trip(
        db_session, default_currency="USD", user_id=test_user["user"].id
    )

    expense = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
    )
    db_session.add(expense)
    db_session.commit()
    db_session.refresh(expense)

    resp = client.put(f"/expenses/{expense.id}", json={"amount": 100.0})
    assert resp.status_code == 200
    data = resp.json()
    # 100 * 1.08 = 108.00
    assert float(data["base_amount"]) == 108.0


def test_check_budget_uses_base_amount(client, db_session, test_user):
    """Budget check converts expense to base currency first."""
    trip = _create_trip(
        db_session, default_currency="USD", budget=100, user_id=test_user["user"].id
    )

    with patch(
        "app.routers.expenses.convert",
        return_value=(Decimal("1.08"), Decimal("102.60")),
    ):
        resp = client.post(
            "/expenses/check-budget/",
            json={
                "trip_id": trip.id,
                "category": "food",
                "amount": 95.0,
                "currency": "EUR",
                "date": str(date.today()),
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["would_exceed"] is True
    assert data["base_currency"] == "USD"
