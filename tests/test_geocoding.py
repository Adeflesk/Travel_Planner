import os
from unittest.mock import patch, Mock


def test_geocode_returns_lat_lng_on_success():
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "features": [{"center": [-2.3522, 48.8566]}]  # Mapbox: [lng, lat]
    }

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Paris, France")

    assert result == (48.8566, -2.3522)  # returns (lat, lng)


def test_geocode_returns_none_on_empty_features():
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"features": []}

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Nowhere Special")

    assert result is None


def test_geocode_returns_none_on_non_200():
    mock_response = Mock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"message": "Unauthorized"}

    with patch("app.services.geocoding.httpx.get", return_value=mock_response):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Paris")

    assert result is None


def test_geocode_returns_none_when_token_missing():
    env = {k: v for k, v in os.environ.items() if k != "MAPBOX_TOKEN"}
    with patch.dict(os.environ, env, clear=True):
        import importlib
        import app.services.geocoding as geo_module

        importlib.reload(geo_module)
        result = geo_module.geocode("Paris")

    assert result is None


def test_geocode_returns_none_on_network_error():
    import httpx

    with patch(
        "app.services.geocoding.httpx.get", side_effect=httpx.RequestError("timeout")
    ):
        with patch.dict(os.environ, {"MAPBOX_TOKEN": "pk.test"}):
            from app.services.geocoding import geocode

            result = geocode("Paris")

    assert result is None
