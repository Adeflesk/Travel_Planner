# Feature: Weather Integration

**Status:** Planned
**Priority:** Medium
**Complexity:** Medium

## Overview

Display weather forecasts for trip destinations to help users plan activities and pack appropriately. Show current conditions and forecasts for the trip dates.

## User Stories

1. As a traveler, I want to see the weather forecast for my destinations so I can plan activities accordingly
2. As a traveler, I want weather alerts for extreme conditions so I can prepare or adjust plans
3. As a traveler, I want packing suggestions based on weather so I don't forget essentials

## UX Design

### Destination Card - Weather Badge

```
┌─────────────────────────────────────────────────────────────┐
│ Paris, France                                    ☀️ 72°F    │
│ Jun 15 - Jun 20                                  Sunny      │
├─────────────────────────────────────────────────────────────┤
│ [Activities] [Expenses] [Weather Details ▼]                 │
└─────────────────────────────────────────────────────────────┘
```

### Weather Details Panel (Expanded)

```
┌─────────────────────────────────────────────────────────────┐
│ 🌤️ Weather Forecast for Paris                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Jun 15    Jun 16    Jun 17    Jun 18    Jun 19    Jun 20  │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │ ☀️  │  │ ⛅ │  │ 🌧️ │  │ 🌧️ │  │ ⛅ │  │ ☀️  │     │
│  │ 72° │  │ 68° │  │ 61° │  │ 59° │  │ 65° │  │ 70° │     │
│  │ 58° │  │ 55° │  │ 52° │  │ 50° │  │ 54° │  │ 56° │     │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘     │
│                                                             │
│  ⚠️ Rain expected Jun 17-18. Consider indoor activities.   │
│                                                             │
│  📦 Packing Suggestions:                                    │
│  • Rain jacket or umbrella                                  │
│  • Light layers for cool evenings                           │
│  • Comfortable walking shoes                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Trip Summary - Weather Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Trip Weather Overview                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paris         ☀️ → 🌧️ → ☀️    59°-72°F                     │
│  Lyon          ⛅ → ☀️         62°-75°F                      │
│  Nice          ☀️ → ☀️ → ☀️    70°-82°F                     │
│                                                             │
│  Overall: Pack for mixed conditions                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   View Trip  │────▶│  See Weather │────▶│   Expand     │
│              │     │   Badges     │     │   Details    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Add Items   │◀────│   Packing    │◀────│   View       │
│  to List     │     │  Suggestions │     │  Forecast    │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Data Model

### WeatherCache (new table - for caching API responses)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| location | String | City/country or coordinates |
| date | Date | Forecast date |
| temp_high | Float | High temperature (Celsius) |
| temp_low | Float | Low temperature (Celsius) |
| condition | String | sunny, cloudy, rain, snow, etc. |
| precipitation_chance | Integer | 0-100% |
| humidity | Integer | 0-100% |
| wind_speed | Float | km/h |
| cached_at | DateTime | When data was fetched |

## API Integration

Use a weather API (OpenWeatherMap, WeatherAPI, or similar):
- Free tier typically allows 1000 calls/day
- Cache responses for 6-12 hours
- Fetch on-demand when user views destination

### Backend Endpoints

```
GET /api/destinations/{id}/weather
Response: {
  "location": "Paris, France",
  "current": { "temp": 72, "condition": "sunny", ... },
  "forecast": [
    { "date": "2024-06-15", "high": 72, "low": 58, "condition": "sunny" },
    ...
  ],
  "packing_suggestions": ["umbrella", "light jacket", ...]
}
```

## Frontend Components

```
frontend/components/weather/
├── WeatherBadge.tsx       # Small badge for destination cards
├── WeatherForecast.tsx    # Expandable forecast panel
├── WeatherOverview.tsx    # Trip-level weather summary
├── PackingSuggestions.tsx # Weather-based packing tips
├── useWeather.ts          # Hook for fetching weather data
└── index.ts
```

## Acceptance Criteria

- [ ] Weather badge displays on destination cards
- [ ] Expandable forecast shows daily weather for trip dates
- [ ] Weather alerts shown for extreme conditions
- [ ] Packing suggestions based on forecast
- [ ] Temperature displayed in user's preferred unit (F/C)
- [ ] Graceful handling when weather API is unavailable
- [ ] Weather data cached to minimize API calls

## Future Enhancements

- Historical weather data for trips in the past
- Weather notifications/alerts before trip
- Integration with activity scheduling (suggest indoor activities on rainy days)
- Hourly forecast for specific activities
