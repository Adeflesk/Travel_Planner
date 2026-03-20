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


from datetime import date  # noqa: E402

from app import models  # noqa: E402


def test_first_destination_sets_trip_currency(client, test_user, testing_session_local):
    """Adding the first destination with a country infers the trip's base currency."""
    db = testing_session_local()
    user = test_user["user"]

    # Create trip with no default_currency set
    trip = models.Trip(
        name="Euro Trip",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        user_id=user.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    resp = client.post(
        "/destinations/",
        json={"trip_id": trip.id, "name": "Paris", "country": "France", "order": 1},
    )
    assert resp.status_code == 201

    db.refresh(trip)
    assert trip.default_currency == "EUR"
    db.close()
