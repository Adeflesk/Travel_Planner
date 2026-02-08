# Feature: Journey Route Details

**Status:** Complete
**Priority:** Low
**Complexity:** Medium

## Overview

Add route information to journeys, especially useful for road trips. Track distance, estimated duration, route type, and toll information.

## Use Cases

- Plan road trips with accurate time/distance estimates
- Choose between scenic and fastest routes
- Track toll costs for budgeting
- Estimate fuel costs based on distance
- Compare route options

## Requirements

1. Add route fields to Journey model
2. Manual entry for distance/duration
3. Optional: API integration for auto-calculation
4. Display route info in journey view
5. Use in total trip planning

## Data Model Changes

### Journey (extended fields)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| distance_km | Decimal | No | Route distance in kilometers |
| distance_miles | Decimal | No | Route distance in miles |
| estimated_duration_minutes | Integer | No | Driving time without stops |
| route_type | Enum | No | Type of route |
| has_tolls | Boolean | No | Route includes toll roads |
| toll_cost | Decimal | No | Estimated toll costs |
| route_notes | Text | No | Route-specific notes |

### Route Types
- `fastest` - Quickest route (typically highways)
- `shortest` - Shortest distance
- `scenic` - Scenic/tourist route
- `avoid_highways` - Back roads only
- `avoid_tolls` - No toll roads

## API Changes

Extend existing journey endpoints to include new fields.

No new endpoints required.

## Frontend Changes

### Journey Form
- "Route Details" expandable section
- Distance input (with km/miles toggle)
- Duration input (hours:minutes)
- Route type dropdown
- Toll checkbox and cost field

### Journey Detail View
- Route info card/section
- Distance and duration displayed
- Route type badge
- Toll indicator if applicable

### Trip Summary Integration
- Total driving distance across all journeys
- Total estimated driving time
- Total toll costs

## UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Route Details                                       │
├─────────────────────────────────────────────────────┤
│ 📏 Distance: 350 miles (563 km)                    │
│ ⏱️ Driving time: 5h 30m (without stops)            │
│ 🛣️ Route: Scenic                                   │
│ 💰 Tolls: $12.50                                   │
│                                                     │
│ 📝 "Take I-70 through Glenwood Canyon for views"  │
└─────────────────────────────────────────────────────┘
```

## Files to Modify

### Backend
- `app/models/journey.py` (add new fields)
- `app/schemas/journey.py` (add new fields)
- Alembic migration for new columns

### Frontend
- `frontend/lib/types.ts` (extend Journey interface)
- `frontend/components/journeys/JourneyForm.tsx` (add route section)
- `frontend/components/journeys/JourneyCard.tsx` (display route info)

## Future Enhancements

### Mapping API Integration
- Auto-calculate distance/duration from origin to destination
- Google Maps Directions API or similar
- Show route on map
- Get real-time traffic estimates

### Fuel Calculator
- Input vehicle fuel economy (MPG/L per 100km)
- Calculate estimated fuel cost for journey
- Factor in current fuel prices (API)

### Route Comparison
- Calculate multiple route options
- Compare time vs distance vs tolls
- Save preferred route

## Acceptance Criteria

- [x] New journey fields added to model
- [x] Database columns added (using ALTER TABLE since Alembic not yet implemented)
- [x] Route details section in journey form
- [x] Route info displayed in journey view
- [x] Distance inputs for both km and miles
- [x] Duration properly formatted (hours/minutes)
- [x] Toll checkbox and cost field working

## Dependencies

- Feature 010 (Alembic Migrations) - Skipped, used direct ALTER TABLE statements
