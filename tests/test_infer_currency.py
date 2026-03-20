"""Tests for infer_base_currency() helper."""
from app.services.exchange_rate import infer_base_currency


def test_infer_from_country_france():
    assert infer_base_currency("France") == "EUR"


def test_infer_from_country_japan():
    assert infer_base_currency("Japan") == "JPY"


def test_infer_from_country_united_states():
    assert infer_base_currency("United States") == "USD"


def test_infer_from_country_united_kingdom():
    assert infer_base_currency("United Kingdom") == "GBP"


def test_infer_from_country_case_insensitive():
    assert infer_base_currency("france") == "EUR"


def test_infer_unknown_country_falls_back_to_usd():
    assert infer_base_currency("Atlantis") == "USD"


def test_infer_empty_string_falls_back_to_usd():
    assert infer_base_currency("") == "USD"


def test_infer_none_falls_back_to_usd():
    assert infer_base_currency(None) == "USD"
