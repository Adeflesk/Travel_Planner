"""
tests/test_rebase_currency.py

Tests for POST /trips/{trip_id}/rebase-currency/ endpoint.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from app import models


def _create_trip_with_expenses(db_session, user_id):
    """Create a trip with two expenses in different currencies."""
    trip = models.Trip(
        name="Rebase test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("1000.00"),
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
    e2 = models.Expense(
        trip_id=trip.id,
        category="lodging",
        amount=Decimal("100.00"),
        currency="USD",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("100.00"),
        date=date.today(),
    )
    db_session.add_all([e1, e2])
    db_session.commit()
    return trip


def test_rebase_currency_recalculates_all_expenses(client, db_session, test_user):
    """Rebasing to EUR should recalculate all expenses."""
    trip = _create_trip_with_expenses(db_session, test_user["user"].id)

    # Mock: EUR->EUR = 1.0, USD->EUR = 0.92
    def mock_convert(amount, from_curr, to_curr):
        if from_curr == to_curr:
            return (Decimal("1.0"), amount)
        if from_curr == "EUR" and to_curr == "EUR":
            return (Decimal("1.0"), amount)
        if from_curr == "USD" and to_curr == "EUR":
            rate = Decimal("0.92")
            from decimal import ROUND_HALF_UP

            return (
                rate,
                (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            )
        return None

    with patch("app.routers.trips.convert", side_effect=mock_convert):
        resp = client.post(
            f"/trips/{trip.id}/rebase-currency/",
            json={
                "new_currency": "EUR",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["new_currency"] == "EUR"
    assert data["updated_count"] == 2
    assert data["failed_count"] == 0


def test_rebase_currency_reports_failures(client, db_session, test_user):
    """If rate unavailable for some expenses, report them as failures."""
    trip = _create_trip_with_expenses(db_session, test_user["user"].id)

    def mock_convert(amount, from_curr, to_curr):
        if from_curr == "EUR" and to_curr == "GBP":
            return None  # simulate failure
        if from_curr == "USD" and to_curr == "GBP":
            return (
                Decimal("0.79"),
                (amount * Decimal("0.79")).quantize(Decimal("0.01")),
            )
        return None

    with patch("app.routers.trips.convert", side_effect=mock_convert):
        resp = client.post(
            f"/trips/{trip.id}/rebase-currency/",
            json={
                "new_currency": "GBP",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["failed_count"] == 1
    assert len(data["failed_expense_ids"]) == 1
