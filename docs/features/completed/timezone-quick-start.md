# Quick Start: Integrating Timezone Support

This guide shows how to add timezone support to the journey form.

## Step 1: Update Journey Types

```typescript
// frontend/lib/types.ts
export interface Journey {
  // ... existing fields ...
  origin_timezone?: string;
  destination_timezone?: string;
}

export interface JourneyFormData {
  // ... existing fields ...
  origin_timezone?: string;
  destination_timezone?: string;
}
```

## Step 2: Update Backend Schema

```python
# app/schemas/journey.py
class JourneyBase(BaseModel):
    # ... existing fields ...
    origin_timezone: Optional[str] = None
    destination_timezone: Optional[str] = None
```

## Step 3: Run Database Migration

```bash
cd /path/to/Travel_Planner
python migrations/add_journey_timezones.py
```

## Step 4: Integrate AirportAutocomplete in JourneyForm

```tsx
// frontend/components/journeys/JourneyForm.tsx
import { AirportAutocomplete } from '@/components/ui/AirportAutocomplete';

// Inside JourneyForm component, replace origin_name and destination_name inputs:

{/* Replace origin_name input */}
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700">
    Origin Airport
  </label>
  {formData.transport_mode === 'flight' ? (
    <>
      <AirportAutocomplete
        value={formData.origin_name || ''}
        onSelect={(airport) => {
          updateField('origin_name', airport.iata);
          updateField('origin_timezone', airport.timezone);
        }}
        placeholder="Search origin airport..."
      />
      {formData.origin_timezone && (
        <div className="text-xs text-slate-500 mt-1">
          Timezone: {formData.origin_timezone}
        </div>
      )}
    </>
  ) : (
    <input
      type="text"
      value={formData.origin_name || ''}
      onChange={(e) => updateField('origin_name', e.target.value)}
      placeholder="Origin location"
      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
    />
  )}
</div>

{/* Replace destination_name input */}
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700">
    Destination Airport
  </label>
  {formData.transport_mode === 'flight' ? (
    <>
      <AirportAutocomplete
        value={formData.destination_name || ''}
        onSelect={(airport) => {
          updateField('destination_name', airport.iata);
          updateField('destination_timezone', airport.timezone);
        }}
        placeholder="Search destination airport..."
      />
      {formData.destination_timezone && (
        <div className="text-xs text-slate-500 mt-1">
          Timezone: {formData.destination_timezone}
        </div>
      )}
    </>
  ) : (
    <input
      type="text"
      value={formData.destination_name || ''}
      onChange={(e) => updateField('destination_name', e.target.value)}
      placeholder="Destination location"
      className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
    />
  )}
</div>
```

## Step 5: Display Timezone Info in Journey List

```tsx
// frontend/components/journeys/JourneyList.tsx
import { formatFlightTimeRange, formatDuration, calculateFlightDuration } from '@/lib/timezone-utils';

// In journey card display:
{journey.departure_datetime && journey.arrival_datetime && (
  <div className="text-sm text-slate-600">
    {journey.origin_timezone && journey.destination_timezone ? (
      <>
        <div>
          {formatFlightTimeRange(
            journey.departure_datetime,
            journey.origin_timezone,
            journey.arrival_datetime,
            journey.destination_timezone,
            { showTimezones: true }
          )}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Duration: {formatDuration(
            calculateFlightDuration(
              journey.departure_datetime,
              journey.arrival_datetime
            )
          )}
        </div>
      </>
    ) : (
      <div>
        {new Date(journey.departure_datetime).toLocaleString()} → {new Date(journey.arrival_datetime).toLocaleString()}
      </div>
    )}
  </div>
)}
```

## Step 6: Test

1. Create a new journey with transport_mode = 'flight'
2. Use the airport autocomplete to select LAX → JFK
3. Enter departure and arrival times
4. Verify timezone info is displayed correctly
5. Check that duration calculation accounts for 3-hour time difference

## Common Use Cases

### Use Case 1: Cross-country Flight (LAX → JFK)
- Departure: 8:00 AM PST (Los Angeles)
- Arrival: 4:30 PM EST (New York)
- Duration: 5h 30m (even though clock time shows 8.5 hours)

### Use Case 2: International Flight (JFK → LHR)
- Departure: 10:00 PM EST (New York)
- Arrival: 10:00 AM GMT (London, next day)
- Duration: 7h (overnight flight)

### Use Case 3: Date Line Crossing (LAX → NRT)
- Departure: 11:00 AM PST (Los Angeles, Jan 15)
- Arrival: 3:00 PM JST (Tokyo, Jan 16)
- Duration: 11h (crosses International Date Line)

## Future Enhancements

- [ ] Show "Next Day" indicator when flight crosses midnight
- [ ] Display user's local time alongside flight times
- [ ] Add timezone converter tooltip
- [ ] Show jet lag indicator for long international flights
- [ ] Integrate with flight tracking APIs for real-time updates
