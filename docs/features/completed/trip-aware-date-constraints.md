# Feature: Trip-Aware Date Constraints

## Overview

All date and datetime inputs within a trip now automatically constrain their date pickers to relevant trip dates, eliminating the need for users to scroll through years and months.

## Implementation

### Core Components

1. **TripContext Provider** ([lib/trip-context.tsx](../lib/trip-context.tsx))
   - React Context that provides trip ID and date boundaries (start_date, end_date)
   - Wrapped around trip detail page content
   - Returns `null` when used outside trip context (e.g., trip creation forms)

2. **Date Constraint Utilities** ([lib/date-constraints.ts](../lib/date-constraints.ts))
   - `getDateConstraints()` - For date inputs (type="date")
   - `getDateTimeConstraints()` - For datetime-local inputs
   - Smart defaults based on trip start/end dates
   - Configurable options for allowing dates before/after trip boundaries

### Updated Forms

All forms within the trip detail page now use trip-aware date constraints:

| Form | Fields Constrained | Allow Before/After Trip |
|------|-------------------|-------------------------|
| **JourneyForm** | departure_datetime, arrival_datetime, booking_opens_date, booking_deadline | Yes (flights can be before/after) |
| **DestinationForm** | arrival_date, departure_date | No (must be within trip) |
| **ActivityForm** | scheduled_date | No (must be within trip) |
| **ExpenseForm** | date, cancel_by_date | Yes (bookings/charges can be before/after) |
| **JourneyStopForm** | planned_arrival, planned_departure | Yes (stops can extend beyond trip) |

## User Experience

### Before
- Date pickers default to current date
- Users must scroll through months/years to find trip dates
- Easy to accidentally enter dates outside trip period

### After
- Date pickers default to trip start date (9:00 AM for datetime inputs)
- Min/max constraints prevent selecting dates outside reasonable bounds
- Native browser date picker shows trip-relevant dates immediately
- Reduces data entry errors and time

## Technical Details

### Context Usage Pattern

```typescript
// In any component within TripProvider
const tripContext = useTripContext();

const dateConstraints = getDateConstraints(
  tripContext?.startDate,
  tripContext?.endDate,
  {
    allowBeforeStart: false,
    allowAfterEnd: false,
    defaultTo: 'start',
  }
);

// Apply to input
<input 
  type="date" 
  min={dateConstraints.min}
  max={dateConstraints.max}
/>
```

### Graceful Degradation

- If `tripContext` is `null` (outside trip page), constraints return empty object
- Forms work normally without constraints
- Trip creation form unaffected (no trip context exists yet)

## Future Enhancements

- [ ] Add visual indicator showing trip date range on date inputs
- [ ] Add "Use trip start date" / "Use trip end date" quick buttons
- [ ] Extend to journey option forms (booking dates)
- [ ] Add smart defaults based on previous entries (e.g., last destination departure date)

## Testing Checklist

- [x] All date inputs show correct min/max in trip detail page
- [x] Date pickers open to trip-relevant dates
- [x] Forms work outside trip context (trip creation)
- [x] No TypeScript errors
- [ ] Manual testing: Create destination within trip dates
- [ ] Manual testing: Try to create journey before trip start (should allow)
- [ ] Manual testing: Try to create activity after trip end (should prevent)

## Files Modified

- `frontend/lib/trip-context.tsx` (new)
- `frontend/lib/date-constraints.ts` (new)
- `frontend/app/trips/[id]/page.tsx` (wrapped in TripProvider)
- `frontend/components/journeys/JourneyForm.tsx`
- `frontend/components/destinations/DestinationForm.tsx`
- `frontend/components/activities/ActivityForm.tsx`
- `frontend/components/expenses/ExpenseForm.tsx`
- `frontend/components/journey-stops/JourneyStopForm.tsx`
