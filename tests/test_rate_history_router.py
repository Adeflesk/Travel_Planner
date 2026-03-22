"""Tests for rate history API endpoints."""
import pytest
from unittest.mock import patch


@pytest.fixture
def trip_id(client):
    """Create a test trip and return its ID."""
    response = client.post(
        "/trips/",
        json={
            "name": "Japan Trip",
            "start_date": "2026-04-01",
            "end_date": "2026-04-14",
            "default_currency": "USD",
        },
    )
    return response.json()["id"]


def test_trip_rate_summary_returns_currencies(client, trip_id):
    """Trip rate summary should list currencies from expenses."""
    # Create an expense in JPY
    client.post(
        "/expenses/",
        json={
            "trip_id": trip_id,
            "amount": 5000,
            "currency": "JPY",
            "exchange_rate": 0.0067,
            "category": "food",
            "description": "Ramen",
            "date": "2026-04-02",
        },
    )

    with patch("app.services.exchange_rate.get_rates") as mock_rates:
        mock_rates.return_value = {"JPY": 149.5, "EUR": 0.92}
        response = client.get(f"/rate-history/trip/{trip_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["trip_base_currency"] == "USD"
    assert len(data["currencies"]) >= 1
    assert any(c["target_currency"] == "JPY" for c in data["currencies"])


def test_trip_rate_summary_requires_auth(unauthenticated_client, trip_id):
    """Trip rate summary should return 401 without auth."""
    response = unauthenticated_client.get(f"/rate-history/trip/{trip_id}")
    assert response.status_code in (401, 403)


def test_global_rate_summary_returns_data(client, trip_id):
    """Global rate summary should list all currencies across trips."""
    # Create expense in EUR
    client.post(
        "/expenses/",
        json={
            "trip_id": trip_id,
            "amount": 100,
            "currency": "EUR",
            "exchange_rate": 1.08,
            "category": "transport",
            "description": "Train",
            "date": "2026-04-03",
        },
    )

    with patch("app.services.exchange_rate.get_rates") as mock_rates:
        mock_rates.return_value = {"EUR": 0.92, "GBP": 0.79}
        response = client.get("/rate-history/global")

    assert response.status_code == 200
    data = response.json()
    assert "user_base_currency" in data
    assert "currencies" in data
