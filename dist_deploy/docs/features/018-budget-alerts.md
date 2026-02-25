# Feature: Budget Alerts & Tracking

**Status:** Planned
**Priority:** High
**Complexity:** Low

## Overview

Provide visual budget tracking with progress indicators and alerts when approaching or exceeding budget limits. Help users stay within their travel budget with real-time feedback.

## User Stories

1. As a traveler, I want to see how much of my budget I've used so I can adjust spending
2. As a traveler, I want warnings when I'm approaching my budget limit
3. As a traveler, I want to see budget breakdown by category to identify where I'm overspending
4. As a traveler, I want to distinguish between booked costs and estimated costs

## UX Design

### Trip Header - Budget Progress Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│ Summer Europe Trip 2024                                              │
│ Jun 10 - Jun 25 • 15 days                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Budget: $5,000                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │████████████████████████████████░░░░░░░░░░░░│ $3,450 / $5,000 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  69% used • $1,550 remaining                                        │
│                                                                      │
│  ⚠️ You're 19% over budget for transportation                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Budget Status States

```
Normal (< 75%):
┌────────────────────────────────────────────────────────────┐
│████████████████████████░░░░░░░░░░░░░░░░░│ 60% • $1,200 left│
└────────────────────────────────────────────────────────────┘
(Green progress bar)

Warning (75-90%):
┌────────────────────────────────────────────────────────────┐
│████████████████████████████████████░░░░│ 85% • $450 left  │
└────────────────────────────────────────────────────────────┘
(Yellow/amber progress bar)
⚠️ Approaching budget limit

Danger (90-100%):
┌────────────────────────────────────────────────────────────┐
│███████████████████████████████████████│ 96% • $120 left   │
└────────────────────────────────────────────────────────────┘
(Red progress bar)
🔴 Almost at budget limit!

Over Budget (>100%):
┌────────────────────────────────────────────────────────────┐
│████████████████████████████████████████│████│ 112%        │
└────────────────────────────────────────────────────────────┘
(Red bar with overflow indicator)
🚨 Over budget by $600
```

### Budget Breakdown Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│ Budget Breakdown                                           [Expand] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Category          Spent      Limit      Status                      │
│  ─────────────────────────────────────────────────────              │
│  🚗 Transport      $1,200     $1,000     ████████████░ 120% ⚠️      │
│  🏨 Accommodation  $1,500     $2,000     ██████████░░░ 75%          │
│  🍽️ Food           $400       $600       ██████░░░░░░░ 67%          │
│  🎭 Activities     $250       $400       ██████░░░░░░░ 63%          │
│  🛍️ Shopping       $100       $300       ███░░░░░░░░░░ 33%          │
│  📦 Other          $0         $200       ░░░░░░░░░░░░░ 0%           │
│                                                                      │
│  ─────────────────────────────────────────────────────              │
│  Total             $3,450     $5,000     ██████████░░░ 69%          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Booked vs Estimated Indicator

```
┌─────────────────────────────────────────────────────────────────────┐
│ Cost Summary                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ✓ Booked/Confirmed    $2,800  ████████████████████░░░░░░░░        │
│  ~ Estimated           $650    ░░░░░░░░░░░░░░░░░░░░████████        │
│  ─────────────────────────────                                      │
│  Total Expected        $3,450                                        │
│                                                                      │
│  💡 $650 in estimated costs not yet booked                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Alert Toast Notifications

```
┌────────────────────────────────────────┐
│ ⚠️ Budget Alert                    ✕  │
│                                        │
│ Adding this expense will put you       │
│ over budget by $150                    │
│                                        │
│ [Cancel]  [Add Anyway]                 │
└────────────────────────────────────────┘
```

## User Flow

### Adding Expense with Budget Check

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Add New     │────▶│  Check vs    │────▶│   Within     │────▶ Save
│  Expense     │     │  Budget      │     │   Budget?    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │ No
                                                  ▼
                                          ┌──────────────┐
                                          │  Show Alert  │
                                          │  Continue?   │
                                          └──────┬───────┘
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                              [Add Anyway]                 [Cancel]
```

## Data Model Changes

### Trip (extended fields)
| Field | Type | Description |
|-------|------|-------------|
| budget_alert_threshold | Integer | Percentage to trigger warning (default 75) |
| budget_danger_threshold | Integer | Percentage to trigger danger (default 90) |

### TripBudgetCategory (new table - optional for category budgets)
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| trip_id | Integer | FK to trips |
| category | String | transport, accommodation, food, etc. |
| budget_amount | Decimal | Budget for this category |

## API Endpoints

```
GET /api/trips/{id}/budget-status
Response: {
  "total_budget": 5000,
  "total_spent": 3450,
  "booked_amount": 2800,
  "estimated_amount": 650,
  "percentage_used": 69,
  "remaining": 1550,
  "status": "normal",  // normal, warning, danger, over
  "by_category": [
    { "category": "transport", "spent": 1200, "budget": 1000, "percentage": 120 },
    ...
  ],
  "alerts": [
    { "type": "over_category", "category": "transport", "amount": 200 }
  ]
}
```

## Frontend Components

```
frontend/components/budget/
├── BudgetProgress.tsx      # Main progress bar component
├── BudgetBreakdown.tsx     # Category breakdown panel
├── BudgetAlert.tsx         # Alert toast/modal
├── BudgetSummary.tsx       # Booked vs estimated summary
├── useBudget.ts            # Hook for budget calculations
└── index.ts
```

## Acceptance Criteria

- [ ] Budget progress bar on trip page
- [ ] Color changes based on percentage (green/yellow/red)
- [ ] Warning alert at configurable threshold (default 75%)
- [ ] Danger alert at configurable threshold (default 90%)
- [ ] Over-budget indicator when exceeding 100%
- [ ] Category breakdown showing per-category status
- [ ] Booked vs estimated cost distinction
- [ ] Alert when adding expense that exceeds budget
- [ ] Settings to configure alert thresholds

## Future Enhancements

- Daily spending rate analysis ("At this rate, you'll exceed budget by day 10")
- Budget recommendations based on destination
- Currency conversion for multi-currency trips
- Budget sharing with trip collaborators
- Export budget report
