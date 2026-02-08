# Journey Enhancements - Planning Document

**Status:** Planning
**Created:** 2024

## Current State

A Journey represents travel from point A to point B with:
- Origin/Destination (linked to destinations or free text)
- Departure/Arrival datetimes
- Transport mode (flight, train, bus, car, ferry, walk)
- Cost, carrier, booking reference, notes
- Status (planned, booked, completed)

## Problem Statement

Users want to plan road trips and multi-stop journeys where they:
- Stop for lunch, coffee, or rest breaks
- Visit a viewpoint or attraction along the way
- Break a long drive into segments
- Change transport modes mid-journey
- Track fuel/charging stops

**Example:** Denver to Moab road trip with:
1. Depart Denver 8:00 AM
2. Stop at Glenwood Springs for coffee (10:30 AM - 11:00 AM)
3. Stop at Arches viewpoint for photos (2:00 PM - 2:30 PM)
4. Arrive Moab 4:00 PM

## Naming Discussion

### For the overall concept: "Journeys"
**Keep it.** Alternatives considered:
- "Travel" - too generic
- "Transport" - too logistical
- "Transit" - implies public transport
- "Trips" - conflicts with our Trip model

### For intermediate stops: "Stops"
**Recommended.** Alternatives considered:
- "Waypoints" - sounds too technical/GPS
- "Breaks" - implies rest only, not sightseeing
- "Checkpoints" - sounds like security
- "Pit Stops" - too informal
- "Stopovers" - implies overnight, too long

## Proposed Features

### Feature 014: Journey Stops
Add the ability to define stops along a journey.

**Model: JourneyStop**
- journey_id (FK)
- name (e.g., "Glenwood Springs", "Scenic Overlook")
- location (optional - address or coordinates)
- arrival_time (datetime)
- departure_time (datetime)
- stop_type (rest, meal, fuel, sightseeing, activity, other)
- notes
- order (for multiple stops)

**UI Changes:**
- "Add Stop" button when viewing/editing a journey
- Timeline shows stops inline between origin and destination
- Duration at each stop calculated automatically

### Feature 015: Journey Segments (Future)
For complex multi-modal journeys where transport mode changes.

**Example:** Fly to Denver, rent car, drive to Moab
- Segment 1: Flight Dublin → Denver
- Segment 2: Car Denver → Moab

This could be a "parent journey" with child segments, each with own transport mode.

**Consideration:** May be over-engineering. Could just use multiple journeys and let the timeline sort them.

### Feature 016: Journey Documents
Attach files/links to journeys:
- Boarding passes
- E-tickets
- Rental car confirmations
- Route maps

### Feature 017: Route Details
For road trips especially:
- Estimated distance
- Estimated duration (without stops)
- Route type (highway, scenic, shortest)
- Toll information
- Optional: Integration with mapping API

## Recommended Implementation Order

1. **014 - Journey Stops** (High priority, Medium complexity)
   - Solves the immediate user need
   - Relatively straightforward model addition

2. **016 - Journey Documents** (Medium priority, Low complexity)
   - Simple file/link attachments
   - Useful for all transport modes

3. **017 - Route Details** (Low priority, Medium complexity)
   - Nice to have for road trips
   - Could integrate with Google Maps API

4. **015 - Journey Segments** (Low priority, High complexity)
   - Wait to see if multiple journeys suffice
   - Only build if users really need it

## Data Model Impact

```
Journey (existing)
├── JourneyStop (new - 014)
│   ├── id
│   ├── journey_id (FK)
│   ├── name
│   ├── location
│   ├── arrival_time
│   ├── departure_time
│   ├── stop_type
│   ├── notes
│   └── order
│
└── JourneyDocument (new - 016)
    ├── id
    ├── journey_id (FK)
    ├── name
    ├── file_url or file_path
    ├── document_type
    └── notes
```

## Open Questions

1. Should stops be linkable to Activities? (e.g., "Lunch at Restaurant X" is both a stop and an activity)

2. Should stops affect the journey's total duration calculation?

3. For road trips, should we auto-suggest stops based on distance/time?

4. Should stops have their own cost field? (e.g., lunch cost, fuel cost)

## Next Steps

1. Review and approve this plan
2. Create individual feature specs (014, 015, 016, 017)
3. Implement in recommended order
