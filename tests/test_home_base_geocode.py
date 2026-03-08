"""
tests/test_home_base_geocode.py

Tests geocoding behaviour for the user home_base field.

The geocode() service must never block a save — all failure paths return None.
These tests cover the geocoding fallback branches as they apply to home_base
values stored on UserSettings, and verify that the settings endpoint handles
home_base correctly regardless of geocoding outcome.
"""

import os
from unittest.mock import patch, Mock


# ---------------------------------------------------------------------------
# Geocoding unit tests — home_base query paths
# ---------------------------------------------------------------------------


def _mock_mapbox(coordinates: list[float]) -> Mock:
    """Return a mock httpx response with a single Mapbox feature."""
    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {"features": [{"center": coordinates}]}
    return resp


def test_geocode_home_base_returns_coords():
    """A valid home_base string should resolve to (lat, lng)."""
    with patch(
        "app.services.geocoding.httpx.get",
        return_value=_mock_mapbox([-0.1278, 51.5074]),
    ):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("London, UK")

    assert result == (51.5074, -0.1278)


def test_geocode_home_base_empty_string_returns_none():
    """An empty home_base must not call Mapbox and must return None."""
    with patch("app.services.geocoding.httpx.get") as mock_get:
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("")

    assert result is None
    mock_get.assert_not_called()


def test_geocode_home_base_whitespace_only_returns_none():
    """A whitespace-only home_base is treated the same as empty."""
    with patch("app.services.geocoding.httpx.get") as mock_get:
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("   ")

    assert result is None
    mock_get.assert_not_called()


def test_geocode_home_base_no_mapbox_token_returns_none():
    """Missing MAPBOX_TOKEN must cause geocoding to silently return None."""
    env = {k: v for k, v in os.environ.items() if k != "MAPBOX_TOKEN"}
    with patch.dict(os.environ, env, clear=True):
        import importlib
        import app.services.geocoding as geo_module

        importlib.reload(geo_module)
        result = geo_module.geocode("Tokyo")

    assert result is None


def test_geocode_home_base_unrecognized_location_returns_none():
    """Mapbox returning no features (ambiguous/unknown location) must yield None."""
    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {"features": []}

    with patch("app.services.geocoding.httpx.get", return_value=resp):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Xanadu, Nowhere")

    assert result is None


def test_geocode_home_base_mapbox_error_response_returns_none():
    """A non-200 Mapbox response must not raise and must return None."""
    resp = Mock()
    resp.status_code = 503

    with patch("app.services.geocoding.httpx.get", return_value=resp):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Berlin")

    assert result is None


def test_geocode_home_base_network_error_returns_none():
    """A network exception during home_base geocoding must return None, not raise."""
    import httpx

    with patch(
        "app.services.geocoding.httpx.get", side_effect=httpx.RequestError("timeout")
    ):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Sydney, Australia")

    assert result is None


# ---------------------------------------------------------------------------
# Settings endpoint integration — home_base persistence
# ---------------------------------------------------------------------------


def test_settings_home_base_saved_and_retrieved(client):
    """Setting home_base persists and is returned by GET /settings/."""
    client.get("/settings/")  # ensure defaults exist

    resp = client.patch("/settings/", json={"home_base": "Berlin, Germany"})
    assert resp.status_code == 200
    assert resp.json()["home_base"] == "Berlin, Germany"

    resp2 = client.get("/settings/")
    assert resp2.status_code == 200
    assert resp2.json()["home_base"] == "Berlin, Germany"


def test_settings_home_base_can_be_cleared(client):
    """home_base can be updated to an empty string or None."""
    client.get("/settings/")
    client.patch("/settings/", json={"home_base": "Paris"})

    resp = client.patch("/settings/", json={"home_base": ""})
    assert resp.status_code == 200
    assert resp.json()["home_base"] == ""


def test_settings_home_base_geocode_failure_does_not_block_save(client):
    """
    If geocoding home_base fails (Mapbox down), the settings save must still
    succeed — geocoding is advisory and must never block writes.
    """
    import httpx

    with patch(
        "app.services.geocoding.httpx.get",
        side_effect=httpx.RequestError("connection refused"),
    ):
        resp = client.patch("/settings/", json={"home_base": "Rome, Italy"})

    # Save must succeed regardless of geocoding outcome
    assert resp.status_code == 200
    assert resp.json()["home_base"] == "Rome, Italy"
