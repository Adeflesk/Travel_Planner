# Feature: Trip Statistics API Endpoints

**Status:** Complete
**Priority:** Low
**Complexity:** Medium

## Overview

Add backend endpoints for trip statistics (total costs, days until departure, completion percentage).

## Requirements

1. `/trips/{id}/stats` endpoint returning:
   - Total cost (all categories)
   - Days until departure
   - Trip duration
   - Completion percentage (booked vs planned items)
   - Item counts by category

## Implementation

### Backend Schema (`app/schemas/trip.py`)
```python
class TripStatsCounts(BaseModel):
    destinations: int = 0
    journeys: int = 0
    activities: int = 0
    expenses: int = 0
    packing_items: int = 0

class TripStats(BaseModel):
    total_cost: Decimal = Decimal("0")
    journey_cost: Decimal = Decimal("0")
    expense_cost: Decimal = Decimal("0")
    days_until_departure: Optional[int] = None
    duration_days: int = 0
    completion_percentage: float = 0.0
    booked_journeys: int = 0
    total_journeys: int = 0
    packed_items: int = 0
    total_packing_items: int = 0
    counts: TripStatsCounts = TripStatsCounts()
```

### Backend Endpoint (`app/routers/trips.py`)
```python
@router.get("/trips/{trip_id}/stats/", response_model=schemas.TripStats)
def get_trip_stats(trip_id: int, db: Session, current_user: User):
    # Returns aggregated trip statistics
```

### Frontend Hook (`frontend/components/trips/useTripStats.ts`)
```typescript
export function useTripStats(tripId: number) {
  // Returns { stats, loading, error, reload }
}
```

## Files Modified

- `app/routers/trips.py` - Added `/trips/{id}/stats/` endpoint
- `app/schemas/trip.py` - Added TripStats and TripStatsCounts schemas
- `frontend/lib/api.ts` - Added `tripApi.getStats()` method
- `frontend/lib/types.ts` - Added TripStats and TripStatsCounts types
- `frontend/components/trips/useTripStats.ts` - New hook for fetching stats

## Acceptance Criteria

- [x] Stats endpoint returns correct data
- [x] Frontend can fetch and display stats
- [x] Handles edge cases (no data, past trips)
