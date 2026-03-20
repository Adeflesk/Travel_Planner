"""
tests/test_currency_convert.py

Tests for the convert() helper in exchange_rate service.
"""
from decimal import Decimal
from unittest.mock import patch, Mock

from app.services.exchange_rate import convert, invalidate_cache


def _mock_rates(rates: dict[str, float]) -> Mock:
    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {"result": "success", "rates": rates}
    return resp


def test_convert_normal_case():
    """EUR 50 -> USD at rate 1.08 = 54.00 USD."""
    invalidate_cache()
    mock_resp = _mock_rates({"USD": 1.08, "GBP": 0.86})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is not None
    rate, base_amount = result
    assert float(rate) == 1.08
    assert base_amount == Decimal("54.00")


def test_convert_same_currency():
    """Same currency returns rate 1.0, same amount — no API call."""
    invalidate_cache()
    with patch("app.services.exchange_rate.httpx.get") as mock_get:
        result = convert(Decimal("100"), "USD", "USD")
        mock_get.assert_not_called()

    assert result is not None
    rate, base_amount = result
    assert rate == Decimal("1.0")
    assert base_amount == Decimal("100")


def test_convert_api_failure_returns_none():
    """If rates are unavailable, convert returns None."""
    invalidate_cache()
    import httpx

    with patch(
        "app.services.exchange_rate.httpx.get",
        side_effect=httpx.RequestError("timeout"),
    ):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is None


def test_convert_target_currency_not_in_rates():
    """If target currency isn't in the rates dict, return None."""
    invalidate_cache()
    mock_resp = _mock_rates({"GBP": 0.86})  # no USD

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is None


def test_convert_rounds_to_two_decimals():
    """base_amount is quantized to 2 decimal places."""
    invalidate_cache()
    mock_resp = _mock_rates({"USD": 1.12345})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("100"), "EUR", "USD")

    assert result is not None
    _, base_amount = result
    # 100 * 1.12345 = 112.345 → rounds to 112.35
    assert base_amount == Decimal("112.35")
