# Feature: Flexible Journey Booking & Airport Transfers

**Status:** Planned
**Priority:** Medium-High
**Complexity:** Medium

## Overview

Many journeys (especially local transport like airport transfers, trains, and buses) don't require exact booking times and may not even be bookable until closer to the trip date. This feature adds support for:

1. **Flexible scheduling** - frequency-based instead of exact times
2. **Multiple booking options** - research and compare before booking
3. **Booking windows** - track when tickets become available
4. **Airport transfers** - special handling for ground transport to/from airports

## Problem Statement

Current journey model assumes:
- Exact departure/arrival times are known
- Journeys are booked in advance
- Each journey is a single segment

Real-world scenarios that don't fit:
```
❌ "Airport shuttle runs every 30 minutes, we'll book it a week before"
❌ "Train tickets open 1 month before departure"
❌ "Need to research: Uber vs. shuttle vs. train from airport"
❌ "Bus connection between cities - several companies, decides closer to date"
```

## Use Cases

### 1. Airport Transfers
```
Dublin Airport (DUB) → Dublin City Center
├── Option A: Airlink Express Bus - €7.50, every 15 min
├── Option B: Private Shuttle - €25, pre-book
├── Option C: Taxi - €25-30, on-demand
└── Option D: Uber - ~€20-25, on-demand

Status: Researching
Booking: Decide 1 week before arrival
```

### 2. Flexible Train Journey
```
Prague → Vienna
├── RegioJet - from €15 (book 30 days out)
├── ÖBB - from €19 (book 90 days out)
└── FlixBus - from €12 (book anytime)

Status: Tickets open Feb 15
Notes: Prefer morning departure, flexible on exact time
```

### 3. Multi-Leg Journey with Ground Transport
```
Denver (DEN) → Vail Ski Resort
├── Leg 1: Flight to Denver (firm booking)
├── Leg 2: Ground transport (flexible)
│   ├── Epic Mountain Express - $99 (pre-book)
│   ├── Fresh Tracks - $89 (pre-book)
│   └── Rental car - ~$60/day (compare at booking)
└── Booking window: Opens when flight is booked
```

## Data Model Changes

### New Fields for Journey

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **is_booked** | Boolean | No | Default false - tracks booking status |
| **booking_opens_date** | Date | No | When tickets become available |
| **booking_deadline** | Date | No | Latest date to book |
| **frequency** | String | No | "Every 30 min", "Hourly", etc. |
| **flexibility_level** | Enum | No | exact/flexible/very_flexible |

### Flexibility Levels
- `exact` - Fixed departure/arrival (flights, reserved trains)
- `flexible` - Approximate time, multiple options (buses, shuttles)
- `very_flexible` - On-demand or frequent service (taxis, metros)

### New Model: JourneyOption (Research Phase)

For tracking alternatives before booking:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Primary key |
| journey_id | Integer (FK) | Yes | Parent journey |
| name | String(200) | Yes | Option name |
| carrier | String(100) | No | Company/service |
| transport_mode | String(50) | No | bus/train/shuttle/taxi/uber |
| frequency | String(100) | No | "Every 15 min", "Hourly" |
| estimated_duration | Integer | No | Duration in minutes |
| cost | Decimal | No | Estimated cost |
| currency | String(3) | No | Currency code |
| booking_url | String(500) | No | Link to book |
| notes | Text | No | Pros/cons, details |
| status | Enum | Yes | researching/selected/booked/rejected |
| order | Integer | No | Display order |

### Option Statuses
- `researching` - Still comparing options
- `selected` - Chosen but not yet booked
- `booked` - Confirmed booking
- `rejected` - Decided against this option

## Journey Types

### Type 1: Firm Booking (Current Behavior)
```python
{
  "transport_mode": "flight",
  "departure_datetime": "2024-06-10T08:00:00",
  "arrival_datetime": "2024-06-10T11:30:00",
  "is_booked": True,
  "flexibility_level": "exact"
}
```

### Type 2: Flexible Journey
```python
{
  "transport_mode": "bus",
  "departure_datetime": "2024-06-10T14:00:00",  # Approximate
  "arrival_datetime": "2024-06-10T17:00:00",
  "is_booked": False,
  "flexibility_level": "flexible",
  "frequency": "Every 30 minutes",
  "booking_opens_date": "2024-05-10"
}
```

### Type 3: On-Demand (Airport Transfer)
```python
{
  "transport_mode": "shuttle",
  "departure_datetime": None,  # TBD based on arrival
  "is_booked": False,
  "flexibility_level": "very_flexible",
  "frequency": "On-demand",
  "notes": "Book after flight arrives"
}
```

## Planning Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESEARCH PHASE                              │
│                                                                 │
│  Create Journey: "Dublin Airport → City Center"                │
│                                                                 │
│  Add Options:                                                   │
│  ├── Airlink Bus - €7.50, every 15min  [researching]          │
│  ├── Private Shuttle - €25            [researching]          │
│  ├── Taxi - ~€25-30                   [researching]          │
│  └── Uber - ~€20                      [researching]          │
│                                                                 │
│  Compare & Select:                                              │
│  → "Going with Airlink Bus"           [selected]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BOOKING PHASE                               │
│                                                                 │
│  Journey Status: Not Booked                                     │
│  Booking Opens: [Already available]                             │
│                                                                 │
│  Selected Option: Airlink Bus - €7.50                           │
│  [Book Now →] [Update Times]                                    │
│                                                                 │
│  After Booking:                                                 │
│  → is_booked = True                                             │
│  → Update with actual times                                     │
│  → Create expense record                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## UI/UX Design

### Journey Form - Flexibility Toggle

```
┌──────────────────────────────────────────────────────────────┐
│ Transport Mode: [Bus ▼]                                      │
│                                                              │
│ Booking Status:  ○ Firm booking  ● Not yet booked           │
│                                                              │
│ ┌─ Appears when "Not yet booked" ─────────────────────────┐ │
│ │                                                           │ │
│ │ Flexibility: [Flexible ▼]                                │ │
│ │   • Exact time - reserved, fixed schedule                │ │
│ │   • Flexible - multiple departures, choose closer to trip│ │
│ │   • Very flexible - on-demand, frequent service          │ │
│ │                                                           │ │
│ │ Frequency: [Every 30 minutes                          ]  │ │
│ │                                                           │ │
│ │ Booking Opens: [2024-05-01] (optional)                   │ │
│ │ Book By: [2024-06-01] (optional)                         │ │
│ │                                                           │ │
│ │ [+ Add Booking Options] (research alternatives)          │ │
│ │                                                           │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ Departure: [2024-06-10 14:00] (approximate)                 │
│ Arrival:   [2024-06-10 17:00] (approximate)                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Journey Card - Unbooked Status

```
┌───────────────────────────────────────────────────────────────┐
│ 🚌 Prague → Vienna                        [⚠️ Not Booked]    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ 📅 ~Jun 12, 2024 around 09:00                                │
│ ⏱️  Duration: ~4 hours                                        │
│ 🔄 Frequency: Departures every 2 hours                       │
│                                                               │
│ Booking Options (3):                                          │
│ ├─ ✓ RegioJet - from €15  [Selected] [View Details]         │
│ ├─   ÖBB - from €19       [View Details]                     │
│ └─   FlixBus - from €12   [View Details]                     │
│                                                               │
│ ℹ️  Tickets open Feb 15 • Book by Jun 1                      │
│                                                               │
│ [Research Options] [Mark as Booked] [Edit]                   │
└───────────────────────────────────────────────────────────────┘
```

### Booking Options Panel

```
┌───────────────────────────────────────────────────────────────┐
│ Booking Options for Prague → Vienna                          │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ ✓ RegioJet                                 [Selected]   │   │
│ │   • €15-25 depending on time                            │   │
│ │   • Departures: 07:00, 09:00, 13:00, 17:00            │   │
│ │   • Duration: 4h                                        │   │
│ │   • WiFi, power outlets                                 │   │
│ │   🔗 regiojet.com                          [Book Now]   │   │
│ │                                                          │   │
│ │   Notes: Best price, comfortable buses                  │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │   ÖBB                                                    │   │
│ │   • €19-39                                              │   │
│ │   • Train - multiple daily                              │   │
│ │   • Duration: 4h 10m                                    │   │
│ │   🔗 oebb.at                               [Details]    │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ [+ Add Another Option]                                        │
└───────────────────────────────────────────────────────────────┘
```

### Timeline View - Unbooked Indicator

```
Timeline for Summer Europe 2024

Jun 10  ✈️  Flight to Prague                         ✅ Booked
        └─ Ryanair FR1234, 08:00 → 11:30

Jun 12  🚌  Prague → Vienna                          ⚠️  Not Booked
        └─ RegioJet selected (€15)
           Tickets open Feb 15

Jun 15  🚂  Vienna → Budapest                        ⚠️  Research Needed
        └─ 3 options to compare
           Book by Jun 1
```

## API Endpoints

### Journey Endpoints (Modified)
```
POST   /journeys/              - Add is_booked, flexibility fields
PUT    /journeys/{id}          - Update booking status
PATCH  /journeys/{id}/book     - Mark as booked (set times, create expense)
```

### New Journey Options Endpoints
```
POST   /journeys/{journey_id}/options/           - Add booking option
GET    /journeys/{journey_id}/options/           - List all options
GET    /journeys/{journey_id}/options/{id}       - Get option detail
PUT    /journeys/{journey_id}/options/{id}       - Update option
DELETE /journeys/{journey_id}/options/{id}       - Remove option
PATCH  /journeys/{journey_id}/options/{id}/select - Mark as selected
PATCH  /journeys/{journey_id}/options/reorder    - Reorder options
```

## Dashboard Integration

### Action Items
Add new action types:
```
⚠️  Book Prague → Vienna
    Tickets open Feb 15 • 3 options researched
    [Research][Book Now]

⏰  Booking window opens in 5 days
    Prague → Vienna train tickets
    [Set Reminder][View Options]

❗  Book by deadline approaching
    Vienna → Budapest - Book by Jun 1 (7 days)
    [Book Now]
```

## Implementation Plan

### Phase 1: Core Functionality
- [ ] Add new journey fields (is_booked, flexibility_level, etc.)
- [ ] Create JourneyOption model
- [ ] Backend API endpoints
- [ ] Database migration

### Phase 2: UI - Research
- [ ] Journey form booking status toggle
- [ ] Booking options panel in journey form
- [ ] Add/edit/delete options
- [ ] Select option

### Phase 3: UI - Booking Flow
- [ ] "Mark as Booked" workflow
- [ ] Update journey with actual times
- [ ] Auto-create expense on booking
- [ ] Unbooked indicator badges

### Phase 4: Timeline & Dashboard
- [ ] Timeline shows booking status
- [ ] Dashboard action items for unbooked journeys
- [ ] Booking deadline reminders
- [ ] Booking window notifications

### Phase 5: Enhancements
- [ ] Drag-and-drop reorder options
- [ ] Price comparison view
- [ ] Export options table to PDF
- [ ] Integration with booking links

## Database Migration

```sql
-- Add new columns to journeys table
ALTER TABLE journeys ADD COLUMN is_booked BOOLEAN DEFAULT true;
ALTER TABLE journeys ADD COLUMN booking_opens_date DATE;
ALTER TABLE journeys ADD COLUMN booking_deadline DATE;
ALTER TABLE journeys ADD COLUMN frequency VARCHAR(100);
ALTER TABLE journeys ADD COLUMN flexibility_level VARCHAR(20) DEFAULT 'exact';

-- Create journey_options table
CREATE TABLE journey_options (
    id INTEGER PRIMARY KEY,
    journey_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    carrier VARCHAR(100),
    transport_mode VARCHAR(50),
    frequency VARCHAR(100),
    estimated_duration INTEGER,
    cost DECIMAL(10, 2),
    currency VARCHAR(3),
    booking_url VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'researching',
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);
```

## Acceptance Criteria

### Backend
- [ ] Journey model extended with booking fields
- [ ] JourneyOption model created
- [ ] All API endpoints implemented and tested
- [ ] Database migration successful

### Frontend - Journey Form
- [ ] Booking status toggle (booked/not booked)
- [ ] Flexibility level selector
- [ ] Frequency input
- [ ] Booking date fields
- [ ] Add booking options panel
- [ ] CRUD operations for options
- [ ] Select/deselect options

### Frontend - Journey Display
- [ ] Unbooked badge on journey cards
- [ ] Booking options list
- [ ] Selected option highlighted
- [ ] Booking deadline warnings
- [ ] Mark as booked workflow

### Integration
- [ ] Timeline shows booking status
- [ ] Dashboard action items for unbooked journeys
- [ ] Trip stats include booking completion %
- [ ] Print view indicates unbooked journeys

## Future Enhancements

### Price Tracking
- Monitor booking option prices over time
- Alert when prices drop
- Historical price charts

### Smart Recommendations
- Suggest optimal booking time based on historical data
- Recommend options based on user preferences
- Auto-populate common routes (airport transfers)

### Booking Integration
- Direct booking through partner APIs
- Import booking confirmations
- Sync with calendar

### Templates
- Save common journey options as templates
- "Dublin Airport Transfer" template with pre-filled options
- Share templates with community

## Related Features

- [014-journey-stops.md](completed/014-journey-stops.md) - Stop options use similar "research then select" pattern
- [015-journey-documents.md](completed/015-journey-documents.md) - Store booking confirmations
- [020-dashboard.md](020-dashboard.md) - Action items for unbooked journeys

## Questions & Decisions

### Q: Should airport transfers be a special journey type?
**A:** No, use generic flexibility system. Airport transfers are just `very_flexible` journeys with `origin_name = "Airport XYZ"`.

### Q: How to handle "book after flight confirms"?
**A:** Use `booking_opens_date` = null + note. Dashboard can suggest "Book ground transport" after flight is booked.

### Q: What about journeys that booking window passed?
**A:** Show warning in UI. Allow manual "mark as booked" with note explaining why.

### Q: Should we auto-create expenses when marking as booked?
**A:** Yes, optional. Prompt user: "Create expense? [Yes, €15] [No] [Custom]"

## Notes

- Keep exact vs. flexible journeys in same model - simpler than separate types
- Options panel works for any transport mode, not just buses/trains
- Dashboard action items drive user to complete bookings
- Print view should clearly indicate unbooked journeys with warnings
