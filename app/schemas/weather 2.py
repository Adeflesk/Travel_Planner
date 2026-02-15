"""
app/schemas/weather.py - Weather Pydantic schemas

Defines Weather-related Pydantic models for API responses.

Author: Travel Planner Team
"""

from typing import List, Optional

from pydantic import BaseModel


class WeatherDay(BaseModel):
    """Weather data for a single day."""

    date: str  # ISO format (YYYY-MM-DD)
    temp_high_f: float
    temp_low_f: float
    temp_high_c: float
    temp_low_c: float
    condition: str  # "clear", "clouds", "rain", "snow", "drizzle"
    description: str  # "Light rain", "Partly cloudy", etc.
    precipitation_chance: int  # 0-100
    humidity: int  # 0-100
    wind_speed_mph: float
    wind_speed_kmh: float
    icon: str  # OpenWeatherMap icon code


class WeatherForecast(BaseModel):
    """Weather forecast for a location."""

    location: str
    current: Optional[WeatherDay] = None
    forecast: List[WeatherDay]
    packing_suggestions: List[str]
    cached: bool  # Indicates if data is from cache
