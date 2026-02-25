# Feature: Journey Date/Time Validation

**Status:** Complete
**Priority:** Medium
**Complexity:** Low

## Overview

Add validation to ensure journey times are logical and fall within trip dates.

## Requirements

1. Departure datetime must be before arrival datetime
2. Journey dates should fall within the trip's start and end dates (warning, not error)
3. Show validation errors inline on the form

## Approach

### Frontend Validation (useJourneyForm.ts)
- Add validation in `handleSubmit` before API call
- Compare departure/arrival datetimes
- Fetch trip dates to validate against trip range

### Backend Validation (app/routers/journeys.py)
- Add Pydantic validator or check in create/update endpoints
- Return 422 with clear error message if invalid

## Files to Modify

- `frontend/components/journeys/useJourneyForm.ts`
- `frontend/components/journeys/JourneyForm.tsx` (error display)
- `app/routers/journeys.py`
- `app/schemas/journey.py`

## Acceptance Criteria

- [x] Cannot submit form if departure > arrival
- [x] Warning shown if journey outside trip dates
- [x] Clear error messages displayed to user
