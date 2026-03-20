"""Tests for GET /exchange-rates/pair/ endpoint."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_pair_same_currency():
    """Same currency returns rate 1.0 without calling API."""
    resp = client.get("/exchange-rates/pair/", params={"from": "USD", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] == 1.0
    assert data["from"] == "USD"
    assert data["to"] == "USD"


@patch("app.routers.exchange_rates.get_rates")
def test_pair_different_currency(mock_get_rates):
    """Different currencies returns rate from exchange rate service."""
    mock_get_rates.return_value = {"USD": 1.08}
    resp = client.get("/exchange-rates/pair/", params={"from": "EUR", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] == 1.08
    assert data["from"] == "EUR"
    assert data["to"] == "USD"
    mock_get_rates.assert_called_once_with("EUR")


@patch("app.routers.exchange_rates.get_rates")
def test_pair_rate_unavailable(mock_get_rates):
    """Returns null rate when service is unavailable."""
    mock_get_rates.return_value = None
    resp = client.get("/exchange-rates/pair/", params={"from": "EUR", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] is None
