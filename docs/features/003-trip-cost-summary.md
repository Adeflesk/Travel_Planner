# Feature: Trip Cost Summary Dashboard

**Status:** Planned
**Priority:** High
**Complexity:** Medium

## Overview

Add a summary section showing total costs across journeys, accommodations, and expenses for a trip.

## Requirements

1. Calculate totals by category (journeys, accommodations, expenses)
2. Show grand total
3. Display on trip detail page
4. Handle multiple currencies (convert or group by currency)

## Approach

### Option A: Frontend Calculation
- Calculate totals from existing data in trip detail page
- Pros: Simple, no backend changes
- Cons: Recalculates on every render

### Option B: Backend Endpoint
- Add `/trips/{id}/summary` endpoint
- Return pre-calculated totals
- Pros: Better performance, can add caching
- Cons: More backend work

**Recommended:** Start with Option A, migrate to B if needed.

## Files to Modify

- `frontend/components/trips/TripDetail.tsx` or new `TripSummary.tsx`
- (Optional) `app/routers/trips.py` - new summary endpoint

## UI Design

```
┌─────────────────────────────────────┐
│ Trip Budget Summary                 │
├─────────────────────────────────────┤
│ Journeys:        $1,234.00          │
│ Accommodations:    $890.00          │
│ Expenses:          $456.00          │
├─────────────────────────────────────┤
│ Total:           $2,580.00          │
│ Budget:          $3,000.00          │
│ Remaining:         $420.00          │
└─────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Summary section visible on trip detail page
- [ ] Totals calculated correctly
- [ ] Shows remaining budget if budget is set
- [ ] Handles trips with no costs gracefully
