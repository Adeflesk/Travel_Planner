"""
tests/test_exchange_rate_service.py

Tests for the exchange rate service (app/services/exchange_rate.py) and
the GET /exchange-rates/ endpoint.
"""

from unittest.mock import patch, Mock

import pytest

from app.services.exchange_rate import get_rates, invalidate_cache


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_er_response(rates: dict[str, float], status: int = 200) -> Mock:
    resp = Mock()
    resp.status_code = status
    resp.json.return_value = {"result": "success", "rates": rates}
    return resp


# ---------------------------------------------------------------------------
# Service unit tests
# ---------------------------------------------------------------------------


def test_get_rates_returns_dict_on_success():
    invalidate_cache()
    mock_resp = _mock_er_response({"EUR": 0.92, "GBP": 0.79})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = get_rates("USD")

    assert result is not None
    assert result["EUR"] == pytest.approx(0.92)
    assert result["GBP"] == pytest.approx(0.79)


def test_get_rates_uses_cache_on_second_call():
    invalidate_cache()
    mock_resp = _mock_er_response({"EUR": 0.92})

    with patch(
        "app.services.exchange_rate.httpx.get", return_value=mock_resp
    ) as mock_get:
        get_rates("USD")
        get_rates("USD")  # should be a cache hit

    assert mock_get.call_count == 1


def test_get_rates_returns_none_on_network_error():
    invalidate_cache()
    import httpx

    with patch(
        "app.services.exchange_rate.httpx.get",
        side_effect=httpx.RequestError("timeout"),
    ):
        result = get_rates("USD")

    assert result is None


def test_get_rates_returns_none_on_non_200():
    invalidate_cache()
    mock_resp = Mock()
    mock_resp.status_code = 503

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = get_rates("USD")

    assert result is None


def test_get_rates_returns_none_on_api_error_result():
    invalidate_cache()
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"result": "error", "error-type": "invalid-key"}

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = get_rates("USD")

    assert result is None


def test_get_rates_returns_stale_cache_on_failure():
    """If cache exists but fetch fails, return stale data rather than None."""
    invalidate_cache()
    import httpx

    # Populate cache first
    mock_resp = _mock_er_response({"EUR": 0.91})
    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        get_rates("USD")

    # Force cache expiry by patching monotonic
    import app.services.exchange_rate as er_module

    original_cache = dict(er_module._cache)
    er_module._cache["USD"] = (0.0, original_cache["USD"][1])  # set timestamp to epoch

    # Now fail the network call — stale cache should be returned
    with patch(
        "app.services.exchange_rate.httpx.get", side_effect=httpx.RequestError("down")
    ):
        result = get_rates("USD")

    assert result is not None
    assert result["EUR"] == pytest.approx(0.91)


def test_get_rates_empty_base_returns_none():
    result = get_rates("")
    assert result is None


def test_get_rates_normalises_base_to_uppercase():
    invalidate_cache()
    mock_resp = _mock_er_response({"USD": 1.0})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = get_rates("eur")

    assert result is not None


# ---------------------------------------------------------------------------
# Router endpoint tests
# ---------------------------------------------------------------------------


def test_exchange_rates_endpoint_returns_200(client):
    invalidate_cache()
    mock_resp = _mock_er_response({"EUR": 0.92, "JPY": 149.5})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        resp = client.get("/exchange-rates/?base=USD")

    assert resp.status_code == 200
    data = resp.json()
    assert "EUR" in data
    assert data["EUR"] == pytest.approx(0.92)


def test_exchange_rates_endpoint_returns_503_when_unavailable(client):
    invalidate_cache()
    import httpx

    with patch(
        "app.services.exchange_rate.httpx.get",
        side_effect=httpx.RequestError("connection refused"),
    ):
        resp = client.get("/exchange-rates/?base=USD")

    assert resp.status_code == 503


def test_exchange_rates_endpoint_defaults_to_usd(client):
    invalidate_cache()
    mock_resp = _mock_er_response({"EUR": 0.92})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        resp = client.get("/exchange-rates/")

    assert resp.status_code == 200
