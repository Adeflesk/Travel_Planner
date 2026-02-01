# Feature: Journey Stops & Stop Options

**Status:** Planned
**Priority:** High
**Complexity:** Medium-High

## Overview

Add the ability to define stops along a journey and explore multiple options for what to do at each stop. This supports the natural planning process where travelers research alternatives before committing to a plan.

## The Planning Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLANNING PHASE                           │
│                                                                 │
│  1. CREATE STOP                                                 │
│     "We'll stop at Glenwood Springs"                           │
│                                                                 │
│  2. RESEARCH OPTIONS                                            │
│     ├── "Riverside Walk" - 45 min, free                        │
│     ├── "Canyon Trail" - 2 hrs, free                           │
│     ├── "Hot Springs Pool" - 1.5 hrs, $25                      │
│     └── "Quick coffee at Starbucks" - 20 min, ~$8              │
│                                                                 │
│  3. COMPARE & DECIDE                                            │
│     "We only have 1 hour, so let's do the Riverside Walk       │
│      and grab coffee"                                          │
│     → Mark as SELECTED                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DURING TRIP                              │
│                                                                 │
│  4. EXECUTE                                                     │
│     ├── "Riverside Walk" → Done ✓                              │
│     ├── "Quick coffee" → Done ✓ → Creates Expense ($8.50)      │
│     └── "Canyon Trail" → Skipped (no time)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Example Use Case

**Denver to Moab road trip - planning the Glenwood Springs stop:**

| Option | Type | Duration | Est. Cost | Status |
|--------|------|----------|-----------|--------|
| Riverside Walk | activity | 45 min | Free | considering |
| Canyon Trail (long) | activity | 2 hrs | Free | considering |
| Glenwood Hot Springs | activity | 1.5 hrs | $25 | considering |
| Slope & Hatch (lunch) | meal | 45 min | ~$30 | **selected** |
| Starbucks (quick coffee) | meal | 15 min | ~$8 | considering |
| Iron Mountain viewpoint | sightseeing | 20 min | Free | **selected** |

User decides: "1 hour total - do the viewpoint (20 min) and lunch (45 min)"

## Data Model

### JourneyStop
A location along a journey where the traveler pauses.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Primary key |
| journey_id | Integer (FK) | Yes | Parent journey |
| name | String(200) | Yes | Stop name (e.g., "Glenwood Springs") |
| location | String(500) | No | Address, coordinates, or place reference |
| planned_arrival | DateTime | No | When planning to arrive |
| planned_departure | DateTime | No | When planning to leave |
| actual_arrival | DateTime | No | When actually arrived |
| actual_departure | DateTime | No | When actually left |
| notes | Text | No | General notes about the stop |
| order | Integer | Yes | Order within journey |

### StopOption
Something you COULD do at a stop - used for planning and comparison.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Primary key |
| stop_id | Integer (FK) | Yes | Parent stop |
| name | String(200) | Yes | Option name |
| description | Text | No | Details, what to expect |
| option_type | Enum | Yes | Type of option (see below) |
| estimated_duration | Integer | No | Duration in minutes |
| estimated_cost | Decimal | No | Expected cost |
| currency | String(3) | No | Currency code |
| url | String(500) | No | Link for more info |
| notes | Text | No | Additional notes |
| status | Enum | Yes | Planning status (see below) |
| order | Integer | No | Display order |

### Option Types
| Type | Icon | Description |
|------|------|-------------|
| `activity` | 🥾 | Walks, hikes, tours, experiences |
| `meal` | 🍽️ | Restaurants, cafes, food stops |
| `sightseeing` | 📸 | Viewpoints, landmarks, photo ops |
| `rest` | ☕ | Coffee break, bathroom, stretch |
| `fuel` | ⛽ | Gas station, EV charging |
| `shopping` | 🛍️ | Stores, markets, souvenirs |
| `other` | 📍 | Anything else |

### Option Status Flow
```
considering  →  selected  →  done
                    ↓           ↓
                 skipped    (creates Expense if has cost)
```

| Status | Description |
|--------|-------------|
| `considering` | Researching, not decided yet |
| `selected` | Chosen for the plan |
| `skipped` | Decided against / ran out of time |
| `done` | Completed during trip |

## API Endpoints

### Journey Stops
```
POST   /journeys/{journey_id}/stops/           - Add stop
GET    /journeys/{journey_id}/stops/           - List stops
GET    /journeys/{journey_id}/stops/{id}       - Get stop with options
PUT    /journeys/{journey_id}/stops/{id}       - Update stop
DELETE /journeys/{journey_id}/stops/{id}       - Remove stop
PATCH  /journeys/{journey_id}/stops/reorder    - Reorder stops
```

### Stop Options
```
POST   /stops/{stop_id}/options/               - Add option
GET    /stops/{stop_id}/options/               - List options
PUT    /stops/{stop_id}/options/{id}           - Update option
DELETE /stops/{stop_id}/options/{id}           - Remove option
PATCH  /stops/{stop_id}/options/{id}/status    - Change status
POST   /stops/{stop_id}/options/{id}/to-expense - Convert to expense
```

## Frontend Changes

### Journey Detail View
- Show stops inline between origin and destination
- Each stop expandable to show options
- Visual indicators for stop duration

### Stop Options Panel
- List all options with type icons
- Duration and cost displayed
- Status badges (considering/selected/done/skipped)
- Quick actions: select, skip, mark done
- "Add Option" button for research phase

### Comparison View
- Side-by-side option comparison
- Total time calculator
- "What fits in X minutes?" filter

### Timeline Integration
- Stops appear within their journey
- Selected options shown as sub-items
- Time allocations visible

### Expense Integration
- "Mark as Done" on a meal/paid option
- Prompts to create expense with pre-filled data
- Links expense back to the option

## UI Mockups

### Journey with Stops
```
┌─────────────────────────────────────────────────────────────────┐
│ 🚗 Denver → Moab                                                │
│ Feb 15, 2025 • 8:00 AM - 4:00 PM                               │
├─────────────────────────────────────────────────────────────────┤
│   📍 Denver (Depart 8:00 AM)                                    │
│      │                                                          │
│   ┌──┴─────────────────────────────────────────────────────┐   │
│   │ 📍 STOP: Glenwood Springs                              │   │
│   │    10:30 AM - 11:30 AM (1 hr planned)                  │   │
│   │                                                         │   │
│   │    ✅ Slope & Hatch (lunch) - 45 min                   │   │
│   │    ✅ Iron Mountain viewpoint - 20 min                 │   │
│   │    ○  Riverside Walk - 45 min [considering]            │   │
│   │                                                         │   │
│   │    [+ Add Option]                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│      │                                                          │
│   ┌──┴─────────────────────────────────────────────────────┐   │
│   │ 📍 STOP: Scenic Overlook                               │   │
│   │    2:00 PM - 2:20 PM (20 min)                          │   │
│   │                                                         │   │
│   │    ✅ Photo stop - 20 min                              │   │
│   └─────────────────────────────────────────────────────────┘   │
│      │                                                          │
│   📍 Moab (Arrive 4:00 PM)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Option Comparison
```
┌─────────────────────────────────────────────────────────────────┐
│ Options at Glenwood Springs                    Available: 1 hr │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🍽️ Slope & Hatch          │  🍽️ Starbucks                     │
│  ─────────────────────────  │  ─────────────────────────        │
│  Duration: 45 min           │  Duration: 15 min                 │
│  Est. cost: ~$30            │  Est. cost: ~$8                   │
│  "Great local restaurant"   │  "Quick coffee stop"              │
│  [SELECT]                   │  [SELECT]                         │
│                                                                 │
│  🥾 Riverside Walk          │  🥾 Canyon Trail                  │
│  ─────────────────────────  │  ─────────────────────────        │
│  Duration: 45 min           │  Duration: 2 hrs                  │
│  Est. cost: Free            │  Est. cost: Free                  │
│  "Easy walk along river"    │  "Challenging but scenic"         │
│  [SELECT]                   │  ⚠️ Exceeds available time        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Selected: 0 min of 60 min available                            │
└─────────────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### Backend
- `app/models/journey_stop.py` (new)
- `app/models/stop_option.py` (new)
- `app/schemas/journey_stop.py` (new)
- `app/schemas/stop_option.py` (new)
- `app/routers/journey_stops.py` (new)
- `app/routers/stop_options.py` (new)
- `app/models/__init__.py` (add imports)

### Frontend
- `frontend/lib/types.ts` (add interfaces)
- `frontend/lib/api.ts` (add endpoints)
- `frontend/components/journeys/JourneyStops.tsx` (new)
- `frontend/components/journeys/StopCard.tsx` (new)
- `frontend/components/journeys/StopOptionList.tsx` (new)
- `frontend/components/journeys/StopOptionForm.tsx` (new)
- `frontend/components/journeys/OptionComparison.tsx` (new)
- `frontend/components/timeline/TripTimeline.tsx` (update)

## Acceptance Criteria

### Core Functionality
- [ ] JourneyStop model created with all fields
- [ ] StopOption model created with all fields
- [ ] CRUD endpoints for stops and options
- [ ] Stops displayed in journey view
- [ ] Options listed within each stop

### Planning Features
- [ ] Add multiple options to a stop
- [ ] Duration displayed for each option
- [ ] Estimated cost displayed
- [ ] Status can be changed (considering → selected → done)
- [ ] Time calculator shows total selected duration

### Comparison Features
- [ ] Options viewable side-by-side
- [ ] Warning when selection exceeds available time
- [ ] Filter/sort options by duration or cost

### Integration
- [ ] Stops appear in timeline view
- [ ] Selected options shown in timeline
- [ ] "Mark as Done" creates expense (for paid options)
- [ ] Stops included in print view

## Future Enhancements

- Google Places integration for option suggestions
- Share stop research with travel companions
- Import options from saved places/favorites
- AI suggestions based on interests and time available
- Route optimization considering stop durations
