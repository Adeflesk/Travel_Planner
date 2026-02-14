# Feature: Dashboard

**Status:** Planned
**Priority:** High
**Complexity:** Medium

## Overview

Create a user dashboard that serves as the landing page after login. The dashboard provides a quick overview of upcoming trips, action items requiring attention, travel statistics, and recent trip history.

## User Stories

1. As a traveler, I want to see my next upcoming trip at a glance when I log in
2. As a traveler, I want to know what actions need my attention (unbooked journeys, packing)
3. As a traveler, I want to see my travel statistics to track my adventures
4. As a traveler, I want quick access to my recent trips

## UX Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Welcome back, Adrian                                          [+ New Trip] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  🌴 NEXT TRIP                   │  │  📊 YOUR STATS                  │  │
│  │                                 │  │                                 │  │
│  │  Summer Europe 2024             │  │  ✈️  12 trips total             │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │  🌍 8 countries visited         │  │
│  │  Starts in 23 days              │  │  💰 $4,200 spent this year     │  │
│  │                                 │  │  📅 2 trips upcoming            │  │
│  │  Paris → Amsterdam → Berlin     │  │                                 │  │
│  │                                 │  │                                 │  │
│  │  Budget: $3,450 / $5,000        │  │                                 │  │
│  │  ████████████████░░░░░ 69%      │  │                                 │  │
│  │                                 │  │                                 │  │
│  │  [View Trip →]                  │  │  [View All Stats →]             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Next Trip Card States

```
Has Upcoming Trip:
┌─────────────────────────────────────┐
│  🌴 NEXT TRIP                       │
│                                     │
│  Summer Europe 2024                 │
│  Starts in 23 days                  │
│                                     │
│  Paris → Amsterdam → Berlin         │
│                                     │
│  Budget: ████████████░░░░ 69%       │
│  $3,450 / $5,000                    │
│                                     │
│  [View Trip →]                      │
└─────────────────────────────────────┘

No Upcoming Trips:
┌─────────────────────────────────────┐
│  🌴 NEXT TRIP                       │
│                                     │
│       ✈️                            │
│  No trips planned yet               │
│                                     │
│  Ready for your next adventure?     │
│                                     │
│  [Plan a Trip →]                    │
└─────────────────────────────────────┘

Trip Starting Today:
┌─────────────────────────────────────┐
│  🎉 TRIP STARTS TODAY!              │
│                                     │
│  Summer Europe 2024                 │
│  Jun 10 - Jun 25 • 15 days          │
│                                     │
│  First stop: Paris                  │
│                                     │
│  ☐ 18/24 items packed               │
│                                     │
│  [View Itinerary →]                 │
└─────────────────────────────────────┘
```

### Action Items Section

```
┌───────────────────────────────────────────────────────────────────────┐
│  ⚡ ACTION ITEMS (3)                                                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 Book flight to Amsterdam                      Due in 7 days  │  │
│  │    Summer Europe 2024 • Flight not yet booked    [Book Now →]   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 🟡 Start packing for Europe                      0/24 items     │  │
│  │    Summer Europe 2024 • Trip in 23 days          [View List →]  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 Transportation over budget                    +$200 (120%)   │  │
│  │    Summer Europe 2024 • Review expenses          [Review →]     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  No more action items? Great job! 🎉                                  │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Action Item Types

| Type | Icon | Trigger Condition | Priority |
|------|------|-------------------|----------|
| Unbooked Journey | ✈️ | Journey status = "planned" & departure < 14 days | High |
| Budget Alert | 💰 | Category > 100% of budget | High |
| Packing Reminder | 📦 | Trip < 7 days & packing < 50% | Medium |
| Activity Unbooked | 🎫 | Activity not booked & date < 7 days | Medium |
| Document Missing | 📄 | Journey has no documents & departure < 7 days | Low |

### Recent Trips Grid

```
┌───────────────────────────────────────────────────────────────────────┐
│  Recent Trips                                          [View All →]   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────┐ │
│  │ 🇯🇵             │ │ 🇬🇧             │ │ 🇲🇽             │ │        │ │
│  │                │ │                │ │                │ │   +    │ │
│  │ Japan 2024     │ │ London 2024    │ │ Mexico 2023    │ │  New   │ │
│  │ May 1-15       │ │ Mar 10-17      │ │ Dec 20-30      │ │  Trip  │ │
│  │                │ │                │ │                │ │        │ │
│  │ ✓ Completed    │ │ ✓ Completed    │ │ ✓ Completed    │ │        │ │
│  │ $2,450 spent   │ │ $1,800 spent   │ │ $1,200 spent   │ │        │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────┘ │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Stats Card Detail View (Modal)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Your Travel Statistics                                          ✕   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  All Time                                                           │
│  ─────────────────────────────────────────────────                 │
│  Total Trips:        12                                             │
│  Countries Visited:  8 (🇫🇷 🇩🇪 🇳🇱 🇯🇵 🇬🇧 🇲🇽 🇮🇹 🇪🇸)                      │
│  Cities Explored:    24                                             │
│  Total Spent:        $18,450                                        │
│  Days Traveled:      156                                            │
│                                                                     │
│  This Year (2024)                                                   │
│  ─────────────────────────────────────────────────                 │
│  Trips:              3 completed, 2 upcoming                        │
│  Spent:              $4,200                                         │
│  Most Visited:       Europe (4 trips)                               │
│                                                                     │
│  By Category                                                        │
│  ─────────────────────────────────────────────────                 │
│  ✈️ Flights:          $6,200 (34%)                                  │
│  🏨 Accommodation:    $5,500 (30%)                                  │
│  🍽️ Food:             $3,200 (17%)                                  │
│  🎭 Activities:       $2,100 (11%)                                  │
│  🚗 Transport:        $1,450 (8%)                                   │
│                                                                     │
│                                              [Export Report]        │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

No new database tables required. Dashboard aggregates data from existing tables.

## API Endpoints

### GET /api/dashboard

Returns aggregated dashboard data for the current user.

**Response:**
```json
{
  "user": {
    "name": "Adrian",
    "email": "adrian@example.com"
  },
  "next_trip": {
    "id": 123,
    "name": "Summer Europe 2024",
    "start_date": "2024-06-10",
    "end_date": "2024-06-25",
    "days_until": 23,
    "destinations": ["Paris", "Amsterdam", "Berlin"],
    "budget": 5000,
    "spent": 3450,
    "budget_percentage": 69
  },
  "stats": {
    "total_trips": 12,
    "countries_visited": 8,
    "spent_this_year": 4200,
    "upcoming_trips": 2,
    "days_traveled": 156
  },
  "action_items": [
    {
      "id": "unbooked-journey-456",
      "type": "unbooked_journey",
      "priority": "high",
      "title": "Book flight to Amsterdam",
      "description": "Flight not yet booked",
      "trip_id": 123,
      "trip_name": "Summer Europe 2024",
      "due_in_days": 7,
      "link": "/trips/123/journeys"
    },
    {
      "id": "packing-123",
      "type": "packing",
      "priority": "medium",
      "title": "Start packing for Europe",
      "description": "0/24 items packed",
      "trip_id": 123,
      "trip_name": "Summer Europe 2024",
      "progress": 0,
      "total": 24,
      "link": "/trips/123/packing"
    },
    {
      "id": "budget-alert-transport",
      "type": "budget_alert",
      "priority": "high",
      "title": "Transportation over budget",
      "description": "Review expenses",
      "trip_id": 123,
      "trip_name": "Summer Europe 2024",
      "percentage": 120,
      "over_amount": 200,
      "link": "/trips/123/expenses"
    }
  ],
  "recent_trips": [
    {
      "id": 100,
      "name": "Japan 2024",
      "start_date": "2024-05-01",
      "end_date": "2024-05-15",
      "status": "completed",
      "total_spent": 2450,
      "country_code": "JP"
    },
    {
      "id": 99,
      "name": "London 2024",
      "start_date": "2024-03-10",
      "end_date": "2024-03-17",
      "status": "completed",
      "total_spent": 1800,
      "country_code": "GB"
    }
  ]
}
```

### GET /api/stats

Returns detailed travel statistics (for the modal view).

**Response:**
```json
{
  "all_time": {
    "total_trips": 12,
    "countries_visited": ["FR", "DE", "NL", "JP", "GB", "MX", "IT", "ES"],
    "cities_explored": 24,
    "total_spent": 18450,
    "days_traveled": 156
  },
  "this_year": {
    "trips_completed": 3,
    "trips_upcoming": 2,
    "spent": 4200,
    "most_visited_region": "Europe"
  },
  "by_category": [
    { "category": "flights", "amount": 6200, "percentage": 34 },
    { "category": "accommodation", "amount": 5500, "percentage": 30 },
    { "category": "food", "amount": 3200, "percentage": 17 },
    { "category": "activities", "amount": 2100, "percentage": 11 },
    { "category": "transport", "amount": 1450, "percentage": 8 }
  ]
}
```

## Frontend Components

```
frontend/components/dashboard/
├── DashboardPage.tsx         # Main dashboard page component
├── DashboardHeader.tsx       # Welcome message + new trip button
├── NextTripCard.tsx          # Upcoming trip summary card
├── StatsCard.tsx             # Quick stats summary
├── StatsModal.tsx            # Detailed stats modal
├── ActionItemsList.tsx       # List of action items
├── ActionItem.tsx            # Individual action item
├── RecentTripsGrid.tsx       # Recent trips cards
├── RecentTripCard.tsx        # Individual trip card
├── useDashboard.ts           # Hook for dashboard data
└── index.ts
```

## Implementation Steps

### Backend

1. Create `app/services/dashboard_service.py`
   - `get_next_trip(user_id)` - Get upcoming trip with summary
   - `get_user_stats(user_id)` - Calculate travel statistics
   - `get_action_items(user_id)` - Generate action items list
   - `get_recent_trips(user_id, limit=3)` - Get recent completed trips

2. Create `app/routers/dashboard.py`
   - `GET /api/dashboard` - Main dashboard endpoint
   - `GET /api/stats` - Detailed statistics endpoint

3. Create `app/schemas/dashboard.py`
   - Response models for dashboard data

### Frontend

1. Create dashboard page at `frontend/app/dashboard/page.tsx`
2. Create dashboard components (listed above)
3. Update navigation to include Dashboard link
4. Set dashboard as default route for authenticated users
5. Add loading states and error handling

## Acceptance Criteria

- [ ] Dashboard displays next upcoming trip with countdown
- [ ] Dashboard shows "no trips" state when no upcoming trips
- [ ] Special state when trip starts today
- [ ] Quick stats card shows key metrics
- [ ] Stats modal shows detailed breakdown
- [ ] Action items generated based on:
  - [ ] Unbooked journeys within 14 days
  - [ ] Budget alerts (category over 100%)
  - [ ] Packing progress (< 50% within 7 days)
- [ ] Action items sorted by priority
- [ ] Recent trips grid shows last 3 completed trips
- [ ] All cards link to relevant trip sections
- [ ] Dashboard is responsive on mobile
- [ ] Dashboard loads in < 2 seconds

## Future Enhancements

- Trip countdown widget with animated days
- Weather preview for next destination
- Travel map visualization (visited countries)
- Achievement badges (first international trip, etc.)
- Social sharing of travel stats
- Personalized trip recommendations
