# Feature: Show Accommodations on Timeline

**Status:** Complete
**Priority:** Medium
**Complexity:** Medium

## Overview

Display accommodations alongside journeys on the trip timeline for a complete travel view.

## Requirements

1. Fetch accommodations with timeline data
2. Display accommodation blocks between journeys
3. Different visual style to distinguish from journeys
4. Show check-in/check-out dates, name, location

## Approach

### Data Fetching
- Extend `useTimeline.ts` to fetch accommodations
- Or add `/trips/{id}/timeline` endpoint that returns both

### Timeline Integration
- Create `TimelineAccommodation.tsx` component
- Interleave with journeys based on dates
- Use different icon (bed/hotel) and color scheme

## Files to Modify

- `frontend/components/timeline/useTimeline.ts`
- `frontend/components/timeline/TripTimeline.tsx`
- New: `frontend/components/timeline/TimelineAccommodation.tsx`

## UI Design

```
🏠 Dublin Airport → Denver Airport
   Flight | Mar 15, 10:00 → Mar 15, 14:00

🛏️ Hilton Denver Downtown
   Mar 15 - Mar 18 (3 nights)
   123 Main St, Denver

🏠 Denver Airport → Dublin Airport
   Flight | Mar 18, 16:00 → Mar 19, 08:00
```

## Acceptance Criteria

- [x] Accommodations appear on timeline
- [x] Visually distinct from journeys (purple color scheme)
- [x] Sorted correctly by date
- [x] Shows key info (name, dates, booking status, cost)
