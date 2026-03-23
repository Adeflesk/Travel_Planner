"""
app/services/weather_service.py - Weather data fetching and caching

Integrates with OpenWeatherMap API to fetch weather forecasts for destinations.
Implements in-memory caching with TTL to minimize API calls.

Author: Travel Planner Team
"""

import os
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from app.core.http import timed_get

logger = logging.getLogger(__name__)

# Configuration
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"


def _get_api_key() -> Optional[str]:
    """Get OpenWeather API key from environment (lazy loaded)."""
    return os.getenv("OPENWEATHER_API_KEY")


def _get_cache_ttl() -> int:
    """Get cache TTL from environment (lazy loaded, default 6 hours)."""
    return int(os.getenv("WEATHER_CACHE_TTL", "21600"))


class SimpleCache:
    """Simple in-memory cache with TTL for weather data."""

    def __init__(self):
        self._cache: Dict[str, tuple[Any, datetime]] = {}

    def get(self, key: str, ttl_seconds: int) -> Optional[Any]:
        """Get cached value if it exists and hasn't expired."""
        if key in self._cache:
            value, cached_at = self._cache[key]
            age = (datetime.now() - cached_at).total_seconds()
            if age < ttl_seconds:
                logger.info(f"Cache hit for {key} (age: {age:.0f}s)")
                return value
            else:
                logger.info(f"Cache expired for {key} (age: {age:.0f}s)")
                del self._cache[key]
        return None

    def set(self, key: str, value: Any):
        """Store value in cache with current timestamp."""
        self._cache[key] = (value, datetime.now())
        logger.info(f"Cached data for {key}")

    def clear(self):
        """Clear all cached data."""
        self._cache.clear()


# Global cache instance
_weather_cache = SimpleCache()


def fetch_weather(
    location: str, start_date: Optional[str] = None, end_date: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Fetch weather forecast for a location.

    Args:
        location: City and country (e.g., "Paris, France")
        start_date: Start date in ISO format (optional)
        end_date: End date in ISO format (optional)

    Returns:
        Weather forecast dict or None if unavailable
    """
    api_key = _get_api_key()
    if not api_key:
        logger.warning("OpenWeatherMap API key not configured")
        return None

    # Generate cache key
    cache_key = f"{location}_{start_date}_{end_date}"

    # Check cache first
    cached_data = _weather_cache.get(cache_key, _get_cache_ttl())
    if cached_data:
        cached_data["cached"] = True
        return cached_data

    # Fetch from API
    try:
        forecast_data = _call_openweather_api(location)
        if not forecast_data:
            return None

        # Parse and filter forecast data
        parsed_forecast = _parse_forecast_data(forecast_data, start_date, end_date)

        # Generate packing suggestions
        packing_suggestions = _generate_packing_suggestions(parsed_forecast["forecast"])

        # Build response
        weather_response = {
            "location": location,
            "current": parsed_forecast.get("current"),
            "forecast": parsed_forecast["forecast"],
            "packing_suggestions": packing_suggestions,
            "cached": False,
        }

        # Cache the response
        _weather_cache.set(cache_key, weather_response)

        return weather_response

    except Exception as e:
        logger.error(f"Error fetching weather for {location}: {str(e)}")
        return None


def _call_openweather_api(location: str) -> Optional[Dict[str, Any]]:
    """
    Call OpenWeatherMap 5-day forecast API.

    Args:
        location: City and country (e.g., "Paris, France")

    Returns:
        Raw API response dict or None on failure
    """
    try:
        url = f"{OPENWEATHER_BASE_URL}/forecast"
        params = {
            "q": location,
            "appid": _get_api_key(),
            "units": "imperial",  # Get Fahrenheit
            "cnt": 40,  # 5 days of 3-hour forecasts
        }

        response = timed_get(url, service="openweather", timeout=10.0, params=params)
        response.raise_for_status()

        data = response.json()
        return data

    except Exception as e:
        logger.error("OpenWeatherMap call failed for %s: %s", location, e)
        return None


def _parse_forecast_data(
    data: Dict[str, Any], start_date: Optional[str], end_date: Optional[str]
) -> Dict[str, Any]:
    """
    Parse OpenWeatherMap forecast data into daily summaries.

    Args:
        data: Raw API response
        start_date: Filter start date (ISO format)
        end_date: Filter end date (ISO format)

    Returns:
        Dict with 'current' and 'forecast' keys
    """
    daily_forecasts: Dict[str, List[Dict[str, Any]]] = {}

    # Group forecast entries by date
    for entry in data.get("list", []):
        dt_txt = entry["dt_txt"]  # Format: "2024-01-15 12:00:00"
        forecast_date = dt_txt.split(" ")[0]  # Extract date part

        # Filter by date range if provided
        if start_date and forecast_date < start_date:
            continue
        if end_date and forecast_date > end_date:
            continue

        if forecast_date not in daily_forecasts:
            daily_forecasts[forecast_date] = []

        daily_forecasts[forecast_date].append(entry)

    # Convert to daily summaries
    forecast_list = []
    for date_str in sorted(daily_forecasts.keys()):
        entries = daily_forecasts[date_str]
        daily_summary = _create_daily_summary(date_str, entries)
        forecast_list.append(daily_summary)

    # First day is "current" weather
    current = forecast_list[0] if forecast_list else None

    return {"current": current, "forecast": forecast_list}


def _create_daily_summary(
    date_str: str, entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Create a daily weather summary from 3-hour forecast entries.

    Args:
        date_str: Date in ISO format
        entries: List of 3-hour forecast entries for the day

    Returns:
        Daily weather summary dict
    """
    # Extract all temperatures for the day
    temps = [entry["main"]["temp"] for entry in entries]
    temp_high_f = max(temps)
    temp_low_f = min(temps)

    # Convert to Celsius
    temp_high_c = (temp_high_f - 32) * 5 / 9
    temp_low_c = (temp_low_f - 32) * 5 / 9

    # Get the most common weather condition
    conditions = [entry["weather"][0]["main"].lower() for entry in entries]
    condition = max(set(conditions), key=conditions.count)

    # Get detailed description (use midday entry if available, else first)
    midday_entry = next((e for e in entries if "12:00:00" in e["dt_txt"]), entries[0])
    description = midday_entry["weather"][0]["description"]
    icon = midday_entry["weather"][0]["icon"]

    # Calculate precipitation chance (any rain in forecast)
    has_rain = any("rain" in entry for entry in entries)
    precipitation_chance = 80 if has_rain else 20  # Simplified

    # Get humidity and wind from midday entry
    humidity = midday_entry["main"]["humidity"]
    wind_speed_mph = midday_entry["wind"]["speed"]  # Already in mph from imperial units
    wind_speed_kmh = wind_speed_mph * 1.60934

    return {
        "date": date_str,
        "temp_high_f": round(temp_high_f, 1),
        "temp_low_f": round(temp_low_f, 1),
        "temp_high_c": round(temp_high_c, 1),
        "temp_low_c": round(temp_low_c, 1),
        "condition": condition,
        "description": description,
        "precipitation_chance": precipitation_chance,
        "humidity": humidity,
        "wind_speed_mph": round(wind_speed_mph, 1),
        "wind_speed_kmh": round(wind_speed_kmh, 1),
        "icon": icon,
    }


def _generate_packing_suggestions(forecast: List[Dict[str, Any]]) -> List[str]:
    """
    Generate packing suggestions based on weather forecast.

    Args:
        forecast: List of daily weather summaries

    Returns:
        List of packing suggestion strings
    """
    suggestions = []

    if not forecast:
        return suggestions

    # Analyze temperature range across all days
    all_temps_f = [day["temp_high_f"] for day in forecast] + [
        day["temp_low_f"] for day in forecast
    ]
    max_temp = max(all_temps_f)
    min_temp = min(all_temps_f)
    temp_range = max_temp - min_temp

    # Temperature-based suggestions
    if max_temp > 85:
        suggestions.append("Sunscreen and sunglasses")
        suggestions.append("Light, breathable clothing")
    elif max_temp > 70:
        suggestions.append("Light layers for warm days")
    elif max_temp < 50:
        suggestions.append("Warm jacket or coat")
        suggestions.append("Layers for cold weather")

    if min_temp < 40:
        suggestions.append("Warm layers for cool evenings")

    if temp_range > 30:
        suggestions.append("Versatile layers for changing temperatures")

    # Condition-based suggestions
    conditions = [day["condition"] for day in forecast]

    if "rain" in conditions or "drizzle" in conditions:
        suggestions.append("Rain jacket or umbrella")
        suggestions.append("Waterproof shoes")

    if "snow" in conditions:
        suggestions.append("Winter boots")
        suggestions.append("Warm hat and gloves")

    if "clouds" in conditions and "clear" in conditions:
        suggestions.append("Mix of sun and cloud protection")

    # Default suggestions
    if not suggestions:
        suggestions.append("Comfortable walking shoes")
        suggestions.append("Light jacket")

    return suggestions
