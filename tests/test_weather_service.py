"""
Tests for weather service.

Tests weather fetching, caching, and data parsing.
"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services import weather_service


def test_simple_cache_stores_and_retrieves():
    """Test that cache stores and retrieves values correctly"""
    cache = weather_service.SimpleCache()

    cache.set("test_key", {"data": "value"})
    result = cache.get("test_key", ttl_seconds=100)

    assert result == {"data": "value"}


def test_simple_cache_expires_old_values():
    """Test that cache expires values after TTL"""
    cache = weather_service.SimpleCache()

    cache.set("test_key", {"data": "value"})
    # Manually set cached_at to past time
    cache._cache["test_key"] = (
        {"data": "value"},
        datetime.now() - timedelta(seconds=200),
    )

    result = cache.get("test_key", ttl_seconds=100)
    assert result is None


def test_simple_cache_returns_none_for_missing_key():
    """Test that cache returns None for non-existent keys"""
    cache = weather_service.SimpleCache()
    result = cache.get("nonexistent", ttl_seconds=100)
    assert result is None


def test_simple_cache_clear():
    """Test that cache clear removes all entries"""
    cache = weather_service.SimpleCache()

    cache.set("key1", {"data": "value1"})
    cache.set("key2", {"data": "value2"})
    cache.clear()

    assert cache.get("key1", ttl_seconds=100) is None
    assert cache.get("key2", ttl_seconds=100) is None


@patch.dict("os.environ", {}, clear=True)
def test_fetch_weather_returns_none_when_no_api_key():
    """Test that fetch_weather returns None when API key is not configured"""
    result = weather_service.fetch_weather("Paris, France")
    assert result is None


@patch("app.services.weather_service._get_api_key")
@patch("app.services.weather_service._call_openweather_api")
def test_fetch_weather_returns_cached_data(mock_call_api, mock_get_key):
    """Test that fetch_weather returns cached data on second call"""
    mock_get_key.return_value = "test_api_key"
    mock_api_response = {
        "list": [
            {
                "dt_txt": "2026-02-07 12:00:00",
                "main": {"temp": 50, "humidity": 70},
                "weather": [
                    {"main": "Clear", "description": "clear sky", "icon": "01d"}
                ],
                "wind": {"speed": 5},
                "rain": {},
            }
        ]
    }
    mock_call_api.return_value = mock_api_response

    # Clear cache first
    weather_service._weather_cache.clear()

    # First call should hit API
    result1 = weather_service.fetch_weather("Paris, France", "2026-02-07", "2026-02-08")
    assert result1 is not None
    assert result1["cached"] is False
    assert mock_call_api.call_count == 1

    # Second call should use cache
    result2 = weather_service.fetch_weather("Paris, France", "2026-02-07", "2026-02-08")
    assert result2 is not None
    assert result2["cached"] is True
    assert mock_call_api.call_count == 1  # Still 1, not called again


@patch("app.services.weather_service._get_api_key")
@patch("httpx.get")
def test_call_openweather_api_success(mock_get, mock_get_key):
    """Test successful API call to OpenWeatherMap"""
    mock_get_key.return_value = "test_api_key"

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "list": [
            {
                "dt_txt": "2026-02-07 12:00:00",
                "main": {"temp": 50},
                "weather": [
                    {"main": "Clear", "description": "clear sky", "icon": "01d"}
                ],
                "wind": {"speed": 5},
            }
        ]
    }
    mock_get.return_value = mock_response

    result = weather_service._call_openweather_api("Paris, France")

    assert result is not None
    assert "list" in result
    mock_get.assert_called_once()


@patch("app.services.weather_service._get_api_key")
@patch("httpx.get")
def test_call_openweather_api_handles_404(mock_get, mock_get_key):
    """Test API returns None for location not found (404)"""
    mock_get_key.return_value = "test_api_key"

    mock_response = Mock()
    mock_response.status_code = 404
    mock_response.raise_for_status.side_effect = Exception("404 Not Found")
    mock_get.return_value = mock_response

    result = weather_service._call_openweather_api("InvalidLocation")
    assert result is None


def test_create_daily_summary_calculates_temp_range():
    """Test that daily summary correctly calculates temp ranges"""
    entries = [
        {
            "dt_txt": "2026-02-07 06:00:00",
            "main": {"temp": 45, "humidity": 65},
            "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 5},
        },
        {
            "dt_txt": "2026-02-07 12:00:00",
            "main": {"temp": 55, "humidity": 60},
            "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 6},
        },
        {
            "dt_txt": "2026-02-07 18:00:00",
            "main": {"temp": 50, "humidity": 70},
            "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 4},
        },
    ]

    summary = weather_service._create_daily_summary("2026-02-07", entries)

    assert summary["temp_high_f"] == 55
    assert summary["temp_low_f"] == 45
    assert summary["date"] == "2026-02-07"
    assert summary["condition"] == "clear"


def test_create_daily_summary_converts_to_celsius():
    """Test that temperatures are correctly converted to Celsius"""
    entries = [
        {
            "dt_txt": "2026-02-07 12:00:00",
            "main": {"temp": 32, "humidity": 65},  # 32°F = 0°C
            "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 5},
        }
    ]

    summary = weather_service._create_daily_summary("2026-02-07", entries)

    assert summary["temp_high_f"] == 32
    assert abs(summary["temp_high_c"] - 0) < 0.5  # Should be close to 0°C


def test_generate_packing_suggestions_hot_weather():
    """Test packing suggestions for hot weather"""
    forecast = [{"temp_high_f": 90, "temp_low_f": 75, "condition": "clear"}]

    suggestions = weather_service._generate_packing_suggestions(forecast)

    assert "Sunscreen and sunglasses" in suggestions
    assert "Light, breathable clothing" in suggestions


def test_generate_packing_suggestions_cold_weather():
    """Test packing suggestions for cold weather"""
    forecast = [{"temp_high_f": 40, "temp_low_f": 25, "condition": "clear"}]

    suggestions = weather_service._generate_packing_suggestions(forecast)

    assert "Warm jacket or coat" in suggestions


def test_generate_packing_suggestions_rain():
    """Test packing suggestions for rainy weather"""
    forecast = [{"temp_high_f": 65, "temp_low_f": 55, "condition": "rain"}]

    suggestions = weather_service._generate_packing_suggestions(forecast)

    assert "Rain jacket or umbrella" in suggestions
    assert "Waterproof shoes" in suggestions


def test_generate_packing_suggestions_snow():
    """Test packing suggestions for snowy weather"""
    forecast = [{"temp_high_f": 30, "temp_low_f": 20, "condition": "snow"}]

    suggestions = weather_service._generate_packing_suggestions(forecast)

    assert "Winter boots" in suggestions
    assert "Warm hat and gloves" in suggestions


def test_generate_packing_suggestions_empty_forecast():
    """Test packing suggestions with empty forecast"""
    suggestions = weather_service._generate_packing_suggestions([])
    assert suggestions == []


def test_parse_forecast_data_filters_by_date_range():
    """Test that forecast parsing filters by date range"""
    api_data = {
        "list": [
            {
                "dt_txt": "2026-02-06 12:00:00",  # Before start
                "main": {"temp": 50, "humidity": 70},
                "weather": [{"main": "Clear", "description": "clear", "icon": "01d"}],
                "wind": {"speed": 5},
            },
            {
                "dt_txt": "2026-02-07 12:00:00",  # In range
                "main": {"temp": 55, "humidity": 65},
                "weather": [{"main": "Clear", "description": "clear", "icon": "01d"}],
                "wind": {"speed": 6},
            },
            {
                "dt_txt": "2026-02-10 12:00:00",  # After end
                "main": {"temp": 60, "humidity": 60},
                "weather": [{"main": "Clear", "description": "clear", "icon": "01d"}],
                "wind": {"speed": 7},
            },
        ]
    }

    result = weather_service._parse_forecast_data(
        api_data, start_date="2026-02-07", end_date="2026-02-08"
    )

    assert len(result["forecast"]) == 1
    assert result["forecast"][0]["date"] == "2026-02-07"
