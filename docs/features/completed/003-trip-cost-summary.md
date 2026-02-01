# Feature: Trip Cost Summary Dashboard

**Status:** Complete
**Priority:** High
**Complexity:** Medium

## Overview

Add a summary section showing total costs across journeys, accommodations, and expenses for a trip.

## Requirements

1. Calculate totals by category (journeys, accommodations, expenses)
2. Show grand total
3. Display on trip detail page
4. Handle multiple currencies (convert or group by currency)

## Implementation

Used **Option A: Frontend Calculation** as recommended.

### Files Created
- `frontend/components/trips/TripSummary.tsx` - Summary display component
- `frontend/components/trips/useTripSummary.ts` - Hook for fetching and calculating totals

### Files Modified
- `frontend/components/trips/index.ts` - Added exports
- `frontend/app/trips/[id]/page.tsx` - Integrated TripSummary component

### Features
- Displays journey costs, accommodation costs, and other expenses separately
- Shows grand total of all costs
- Progress bar showing budget usage (green/amber/red based on percentage)
- Shows remaining budget or over-budget warning
- Paid vs unpaid expense breakdown
- Graceful handling of trips with no costs

## UI Design

```
┌─────────────────────────────────────┐
│ 💰 Trip Budget Summary              │
├─────────────────────────────────────┤
│ ✈️  Journeys (2)      $1,234.00     │
│ 🛏️  Accommodations     $890.00      │
│ 🧾  Other Expenses (5)  $456.00     │
├─────────────────────────────────────┤
│ Total Spent          $2,580.00      │
│ Budget               $3,000.00      │
│ [██████████████░░░░] 86%            │
│ ✅ Remaining          $420.00       │
├─────────────────────────────────────┤
│ Paid: $2,000.00  Unpaid: $580.00    │
└─────────────────────────────────────┘
```

## Acceptance Criteria

- [x] Summary section visible on trip detail page
- [x] Totals calculated correctly
- [x] Shows remaining budget if budget is set
- [x] Handles trips with no costs gracefully
