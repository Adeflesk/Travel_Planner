# Time Zone Support for Travel Planner

## Problem Statement

Flight times are meaningless without time zone context. A flight departing at "10:00 AM" could be in any time zone, making it impossible to:
- Calculate actual journey duration
- Plan connections accurately
- Show times in user's local time zone
- Handle daylight saving time transitions

## Current State

**Journey Model** stores:
- `departure_datetime` (DateTime, no timezone)
- `arrival_datetime` (DateTime, no timezone)
- `origin_name` (String, e.g., "LAX")
- `destination_name` (String, e.g., "JFK")
- `carrier` (String, e.g., "United Airlines")

**Problems:**
- No timezone metadata stored
- Times are naive (not timezone-aware)
- Cannot distinguish between local and destination time
- Duration calculations assume same timezone

## Solution Options

### Option 1: Store Timezone Identifiers (Recommended)

Add timezone fields to journeys and use IANA timezone database.

**Pros:**
- Most accurate for historical and future dates
- Handles DST automatically
- Standard approach used by airlines
- Works with Python `zoneinfo` and JavaScript `Intl`

**Cons:**
- Requires timezone database lookup
- Slightly more complex

### Option 2: Store UTC Offsets

Store fixed UTC offsets (e.g., "-08:00", "+01:00").

**Pros:**
- Simple to implement
- Easy to understand

**Cons:**
- Doesn't handle DST changes
- Inaccurate for future dates (DST rules change)
- Not recommended for travel apps

### Option 3: Always Store as UTC

Convert all times to UTC and store only UTC.

**Pros:**
- Simple storage
- Easy comparison

**Cons:**
- Loses original timezone context
- Hard to display "departure time in local time"
- Users think in local time, not UTC

## Recommended Implementation: Option 1

### 1. Database Schema Changes

#### Backend: Add Timezone Fields

```python
# app/models/journey.py
class Journey(Base):
    # ... existing fields ...
    
    # New timezone fields
    origin_timezone = Column(String(50), nullable=True)  # e.g., "America/Los_Angeles"
    destination_timezone = Column(String(50), nullable=True)  # e.g., "America/New_York"
    
    # Store times as UTC-aware datetime when possible
    # departure_datetime and arrival_datetime remain as-is for backward compatibility
```

**Migration:**
```sql
ALTER TABLE journeys ADD COLUMN origin_timezone VARCHAR(50);
ALTER TABLE journeys ADD COLUMN destination_timezone VARCHAR(50);
```

#### Frontend: Update Types

```typescript
export interface Journey {
  // ... existing fields ...
  origin_timezone?: string;  // IANA timezone identifier
  destination_timezone?: string;
}

export interface JourneyFormData {
  // ... existing fields ...
  origin_timezone?: string;
  destination_timezone?: string;
}
```

### 2. Airport Lookup Database

Two approaches for mapping airports to timezones:

#### Approach A: Static JSON File (Quick Win)

Create a curated list of major airports with IATA codes and timezones.

```json
// frontend/data/airports.json
{
  "airports": [
    {
      "iata": "LAX",
      "name": "Los Angeles International",
      "city": "Los Angeles",
      "country": "United States",
      "timezone": "America/Los_Angeles"
    },
    {
      "iata": "JFK",
      "name": "John F. Kennedy International",
      "city": "New York",
      "country": "United States",
      "timezone": "America/New_York"
    },
    {
      "iata": "LHR",
      "name": "London Heathrow",
      "city": "London",
      "country": "United Kingdom",
      "timezone": "Europe/London"
    }
    // ... ~500 major airports
  ]
}
```

**Pros:**
- No external API dependency
- Fast lookups
- Works offline
- No API rate limits

**Cons:**
- Limited to curated airports (~500-1000)
- Manual maintenance
- File size (~100KB)

#### Approach B: Airport API Integration

Use a third-party API like:
- **Aviation Edge API** (free tier: 1000 requests/month)
- **AviationStack API** (free tier: 1000 requests/month)
- **OpenFlights Data** (free, downloadable dataset)

**Pros:**
- Comprehensive coverage (>10,000 airports)
- Always up-to-date
- Includes lat/long for mapping

**Cons:**
- External dependency
- API rate limits
- Requires internet connection
- Potential costs

#### Recommended: Hybrid Approach

1. **Start with static JSON** for top 500-1000 airports
2. **Add autocomplete** that searches the local dataset
3. **Allow manual timezone selection** as fallback
4. **Future enhancement:** Add API integration for comprehensive coverage

### 3. Timezone Utilities

#### Backend (Python)

```python
# app/utils/timezone_utils.py
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

def convert_to_utc(dt: datetime, timezone: str) -> datetime:
    """Convert a naive datetime in a given timezone to UTC."""
    if dt.tzinfo is not None:
        return dt  # Already timezone-aware
    local_tz = ZoneInfo(timezone)
    local_dt = dt.replace(tzinfo=local_tz)
    return local_dt.astimezone(ZoneInfo("UTC"))

def convert_from_utc(dt_utc: datetime, timezone: str) -> datetime:
    """Convert UTC datetime to a specific timezone."""
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=ZoneInfo("UTC"))
    return dt_utc.astimezone(ZoneInfo(timezone))

def calculate_duration_minutes(
    departure_dt: datetime,
    departure_tz: str,
    arrival_dt: datetime,
    arrival_tz: str
) -> int:
    """Calculate flight duration in minutes, accounting for timezones."""
    dep_utc = convert_to_utc(departure_dt, departure_tz)
    arr_utc = convert_to_utc(arrival_dt, arrival_tz)
    duration = arr_utc - dep_utc
    return int(duration.total_seconds() / 60)

def format_timezone_difference(tz1: str, tz2: str, at_date: datetime) -> str:
    """Format timezone difference (e.g., 'LAX is 3 hours behind JFK')."""
    dt1 = at_date.replace(tzinfo=ZoneInfo(tz1))
    dt2 = at_date.replace(tzinfo=ZoneInfo(tz2))
    offset1 = dt1.utcoffset().total_seconds() / 3600
    offset2 = dt2.utcoffset().total_seconds() / 3600
    diff = offset1 - offset2
    if diff == 0:
        return "Same timezone"
    elif diff > 0:
        return f"{abs(diff):.0f} hours ahead"
    else:
        return f"{abs(diff):.0f} hours behind"
```

#### Frontend (TypeScript)

```typescript
// frontend/lib/timezone-utils.ts

/**
 * Format a datetime string with timezone display
 */
export function formatDateTimeWithZone(
  datetime: string,
  timezone: string
): string {
  const date = new Date(datetime);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(date);
}

/**
 * Calculate flight duration accounting for timezones
 */
export function calculateFlightDuration(
  departureTime: string,
  departureTimezone: string,
  arrivalTime: string,
  arrivalTimezone: string
): number {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  return Math.floor((arrival.getTime() - departure.getTime()) / 60000);
}

/**
 * Format duration as "Xh Ym"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbreviation(
  datetime: string,
  timezone: string
): string {
  const date = new Date(datetime);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(date);
  return parts.find(part => part.type === 'timeZoneName')?.value || '';
}
```

### 4. UI Updates

#### Journey Form Enhancement

```tsx
// Show timezone selector with airport autocomplete
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>Origin Airport</label>
    <AirportAutocomplete
      value={formData.origin_name}
      onSelect={(airport) => {
        updateField('origin_name', airport.iata);
        updateField('origin_timezone', airport.timezone);
      }}
    />
    {formData.origin_timezone && (
      <span className="text-xs text-gray-500">
        {formData.origin_timezone}
      </span>
    )}
  </div>
  
  <div>
    <label>Destination Airport</label>
    <AirportAutocomplete
      value={formData.destination_name}
      onSelect={(airport) => {
        updateField('destination_name', airport.iata);
        updateField('destination_timezone', airport.timezone);
      }}
    />
    {formData.destination_timezone && (
      <span className="text-xs text-gray-500">
        {formData.destination_timezone}
      </span>
    )}
  </div>
</div>
```

#### Journey Display Enhancement

```tsx
// Show both local and destination times
<div className="journey-times">
  <div>
    <strong>Departure:</strong>
    <div>{formatDateTimeWithZone(journey.departure_datetime, journey.origin_timezone)}</div>
    <div className="text-xs text-gray-500">
      {getTimezoneAbbreviation(journey.departure_datetime, journey.origin_timezone)}
    </div>
  </div>
  
  <div className="text-center">
    <div className="text-sm text-gray-600">
      Duration: {formatDuration(calculateFlightDuration(...))}
    </div>
  </div>
  
  <div>
    <strong>Arrival:</strong>
    <div>{formatDateTimeWithZone(journey.arrival_datetime, journey.destination_timezone)}</div>
    <div className="text-xs text-gray-500">
      {getTimezoneAbbreviation(journey.arrival_datetime, journey.destination_timezone)}
    </div>
  </div>
</div>
```

## Implementation Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Add timezone columns to database
- [ ] Create migration script
- [ ] Update backend schemas (Journey, JourneyFormData)
- [ ] Update frontend types

### Phase 2: Airport Lookup (Day 2-3)
- [ ] Create airports.json with top 500 airports
- [ ] Build AirportAutocomplete component
- [ ] Add airport search/filter functionality
- [ ] Test with common routes (LAX→JFK, LHR→SFO, etc.)

### Phase 3: Timezone Utilities (Day 3-4)
- [ ] Implement backend timezone utilities
- [ ] Implement frontend timezone utilities
- [ ] Add timezone validation
- [ ] Test DST edge cases

### Phase 4: UI Integration (Day 4-5)
- [ ] Update JourneyForm with timezone fields
- [ ] Update journey list display to show timezones
- [ ] Add timezone info to journey details
- [ ] Update journey timeline to handle timezones

### Phase 5: Polish & Testing (Day 5-6)
- [ ] Manual testing with various routes
- [ ] Test DST transitions
- [ ] Add timezone help text/tooltips
- [ ] Documentation updates

## Data Sources for Airport Database

### Free Resources:
1. **OpenFlights**: https://openflights.org/data.html
   - 14,000+ airports with IATA codes, coordinates
   - Public domain
   - Updated regularly by community

2. **OurAirports**: https://ourairports.com/data/
   - 70,000+ airports/heliports
   - Public domain
   - CSV/JSON format

3. **TimezoneDB**: Manual mapping of airports to IANA timezones
   - Use coordinates + `timezonefinder` library

### Sample Airports to Include (Priority List):

**North America (Top 50)**
- LAX, SFO, JFK, ORD, DFW, ATL, MIA, BOS, SEA, DEN, etc.

**Europe (Top 50)**
- LHR, CDG, FRA, AMS, MAD, FCO, MUC, ZRH, VIE, etc.

**Asia (Top 50)**
- NRT, HND, HKG, SIN, ICN, PVG, BKK, KUL, DEL, etc.

**Others (Top 50)**
- SYD, MEL, GRU, GIG, JNB, DXB, DOH, etc.

**Total: ~200-500 airports covers 95% of commercial flights**

## Testing Strategy

### Test Cases:
1. **Same timezone**: SFO → LAX (both PST)
2. **Cross-country**: LAX → JFK (PST → EST, 3hr difference)
3. **International**: JFK → LHR (EST → GMT, 5hr difference)
4. **DST transition**: Flight during spring forward / fall back
5. **Date line crossing**: LAX → NRT (crosses international date line)
6. **Southern hemisphere**: LAX → SYD (opposite DST seasons)

### Edge Cases:
- Overnight flights (arrival date ≠ departure date)
- Red-eye flights (depart 11pm, arrive 6am next day)
- Very long flights (14+ hours)
- Flights over areas that don't observe DST

## Future Enhancements

- [ ] Show user's local time alongside flight times
- [ ] Timezone converter tool in UI
- [ ] Multi-leg journey timezone handling
- [ ] Time zone alerts ("You'll lose 3 hours crossing zones")
- [ ] Jet lag calculator
- [ ] Optimal booking time suggestions based on timezone

## Backward Compatibility

For existing journeys without timezone data:
1. Display times as-is (no timezone shown)
2. Add "Add Timezone Info" button to edit
3. Gradually migrate as users edit existing journeys
4. Do NOT break existing journey display

## Security & Privacy

- No sensitive data in airport lookup
- Timezone data is public information
- No user tracking via timezone selection
