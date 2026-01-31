# Feature: Currency Selection for Journeys

**Status:** Planned
**Priority:** Low
**Complexity:** Low

## Overview

Allow users to select currency when entering journey costs instead of defaulting to USD.

## Requirements

1. Add currency dropdown next to cost input
2. Display selected currency in journey list and timeline
3. Maintain backwards compatibility (default to USD)

## Approach

### Frontend Changes
- Add currency select dropdown in `JourneyForm.tsx`
- Common currencies: USD, EUR, GBP, CAD, AUD, JPY, etc.
- Display currency code in `JourneyItem.tsx` and `TimelineJourney.tsx`

### Backend
- Already supports currency field, no changes needed

## Files to Modify

- `frontend/components/journeys/JourneyForm.tsx`
- `frontend/components/journeys/JourneyItem.tsx`
- `frontend/components/timeline/TimelineJourney.tsx`

## Acceptance Criteria

- [ ] Currency dropdown appears next to cost field
- [ ] Selected currency saved with journey
- [ ] Currency displayed in journey list and timeline
