# Feature: Journey Sorting Options

**Status:** Planned
**Priority:** Medium
**Complexity:** Low

## Overview

Allow users to sort journeys by different criteria (date, status, transport mode).

## Requirements

1. Add sort dropdown/buttons above journey list
2. Sort options: Date (asc/desc), Status, Transport Mode
3. Remember sort preference (localStorage)

## Approach

### Frontend Only
- Add state for sort criteria in `JourneyList.tsx` or `useJourneys.ts`
- Sort journeys array before rendering
- Persist preference in localStorage

## Files to Modify

- `frontend/components/journeys/JourneyList.tsx`
- `frontend/components/journeys/useJourneys.ts`

## UI Design

```
Sort by: [Date ▼] [Status] [Transport]
```

Or dropdown:
```
Sort by: [Departure Date (Earliest) ▼]
```

## Acceptance Criteria

- [ ] Sort dropdown/buttons visible
- [ ] Journeys reorder when sort changes
- [ ] Sort preference persists across page refreshes
