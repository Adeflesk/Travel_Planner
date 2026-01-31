# Feature: Trip Statistics API Endpoints

**Status:** Planned
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

## Approach

### New Endpoint
```python
@router.get("/{trip_id}/stats")
def get_trip_stats(trip_id: int, db: Session):
    # Query and aggregate data
    return {
        "total_cost": ...,
        "days_until_departure": ...,
        "duration_days": ...,
        "completion_percentage": ...,
        "counts": {
            "destinations": ...,
            "journeys": ...,
            "activities": ...,
        }
    }
```

### Frontend Hook
- Create `useTripStats(tripId)` hook
- Call endpoint and return stats

## Files to Modify

- `app/routers/trips.py`
- `app/schemas/trip.py` (new TripStats schema)
- `frontend/lib/api.ts`
- New: `frontend/hooks/useTripStats.ts`

## Acceptance Criteria

- [ ] Stats endpoint returns correct data
- [ ] Frontend can fetch and display stats
- [ ] Handles edge cases (no data, past trips)
