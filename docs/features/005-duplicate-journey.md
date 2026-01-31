# Feature: Duplicate Journey (Return Trip)

**Status:** Planned
**Priority:** High
**Complexity:** Low

## Overview

Add ability to duplicate a journey with origin/destination swapped - useful for creating return trips.

## Requirements

1. "Duplicate as Return" button on each journey
2. Pre-fills form with swapped origin/destination
3. Clears booking-specific fields (reference, dates)
4. Keeps transport mode, carrier, and approximate cost

## Approach

### Frontend Implementation
- Add button to `JourneyItem.tsx`
- Create `duplicateAsReturn` function in `useJourneyForm.ts`
- Swap origin_id <-> destination_id and origin_name <-> destination_name
- Clear departure_datetime, arrival_datetime, booking_reference
- Set status to "planned"

## Files to Modify

- `frontend/components/journeys/JourneyItem.tsx`
- `frontend/components/journeys/useJourneyForm.ts`
- `frontend/components/journeys/JourneyList.tsx` (pass handler)

## UI Design

Add icon button next to edit/delete:
```
[✏️ Edit] [📋 Duplicate Return] [🗑️ Delete]
```

## Acceptance Criteria

- [ ] Duplicate button visible on each journey
- [ ] Creates new journey with swapped locations
- [ ] Booking-specific fields cleared
- [ ] Form opens with pre-filled data
- [ ] User can edit before saving
