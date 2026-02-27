# Transport Redesign Design

**Date:** 2026-02-27
**Status:** Approved
**Replaces:** Journey Builder, Segment Builder, Journey Stops system

---

## Overview

Replace the complex journey/segment/stop system with a simple, day-first transport model. Transport items live on day pages alongside activities, building the itinerary chronologically. A new trip-level Timeline view shows everything across all days in one place.

---

## Data Model

### New: `TripTransport`

Replaces the `journeys` table and all related tables.

```python
class TripTransport(Base):
    id: int
    trip_id: int                    # FK → Trip
    transport_type: str             # 'flight' | 'train' | 'bus' | 'drive' | 'ferry' | 'other'
    origin: str                     # free text, e.g. "Sydney Airport (SYD)"
    destination: str                # free text, e.g. "London Heathrow (LHR)"
    departure_day_id: int | None    # FK → TripDay
    arrival_day_id: int | None      # FK → TripDay (same or different day)
    departure_time: str             # "HH:MM"
    arrival_time: str               # "HH:MM"
    carrier: str | None             # airline, rail company, bus operator
    reference: str | None           # booking ref, flight number, train code
    cost: float | None
    currency: str | None
    notes: str | None
    booked: bool                    # default false
    sort_order: int
    metadata: dict | None           # type-specific extras (see below)
```

**Type-specific metadata (typed on frontend, stored as JSON):**

```typescript
type FlightMeta   = { flight_number?: string }
type TrainBusMeta = { frequency?: string }        // e.g. "every 2 hours", "3x daily"
type DriveMeta    = { distance_km?: number }
type FerryMeta    = { distance_km?: number; frequency?: string }
```

The metadata field is open for extension — new type-specific fields can be added without schema migrations.

### New: `TransportOption`

Child records for comparing alternatives on a single journey leg (e.g. bus vs train).

```python
class TransportOption(Base):
    id: int
    transport_id: int               # FK → TripTransport
    transport_type: str             # 'flight' | 'train' | 'bus' | 'drive' | 'ferry'
    name: str                       # "Renfe AVE", "FlixBus Express"
    carrier: str | None
    duration_minutes: int | None
    cost: float | None
    currency: str | None
    frequency: str | None
    booking_url: str | None
    notes: str | None
    status: str                     # 'researching' | 'selected' | 'booked' | 'rejected'
    metadata: dict | None           # same type-specific extras as TripTransport
    order: int
```

When an option is marked `selected`, the parent `TripTransport` displays its details. When `booked`, the transport is considered confirmed.

---

## Day Page — Unified Itinerary

The day page is the single place to add, edit, and view both activities and transport. Both item types appear in the same chronological timeline ordered by time.

**Day timeline example:**

```
Day 3 — Friday 14 March · Barcelona
─────────────────────────────────────────
08:00  [Activity]   Breakfast at La Boqueria
09:30  [Activity]   Sagrada Família tour
12:00  ✈ Flight     Barcelona (BCN) → London (LHR)
       Vueling VY7821 · Booked ✓
       ── arrives Day 4 at 14:30 ──
─────────────────────────────────────────
+ Add Activity    + Add Transport
```

**Cross-day transport behaviour:**
- A transport item that departs on Day 3 and arrives on Day 4 appears on **both** day timelines
- On the departure day: shows full details with "→ arrives [Day Name]" badge
- On the arrival day: shows a compact "← arrived from [Origin]" block with arrival time

**Transport with options (comparison mode):**

```
✈/🚂  Barcelona → London            [Comparing 2 options]
─────────────────────────────────────────────────────────
  ○  Vueling flight VY7821    4h 30m   £89    [Select]
  ○  Renfe + Eurostar train   7h 15m   £142   [Select]
─────────────────────────────────────────────────────────
+ Add option
```

Selecting an option promotes it to `selected` status and displays its details on the transport item. Marking it `booked` updates the parent transport's booked flag.

**Transport form fields (on add/edit):**
- Type (flight / train / bus / drive / ferry / other)
- Origin, Destination
- Departure day + time, Arrival day + time
- Carrier, Reference (booking ref / flight number)
- Cost + currency
- Booked toggle
- Notes
- Type-specific extras rendered conditionally (distance for drive, frequency for train/bus, flight number for flight)

---

## Trip Timeline View

A new **Timeline** tab on the trip page provides a read-only chronological overview of all days, activities, and transport across the entire trip.

```
[Overview]  [Timeline]  [Expenses]  [Packing]

── Day 1 · Wed 12 March · Sydney ──────────────
  09:00  Activity    Breakfast + pack
  11:00  ✈ Flight    Sydney (SYD) → Dubai (DXB)
         Emirates EK415 · 14h 20m  →

── Day 2 · Thu 13 March · In transit ──────────
  06:20  ✈ (arriving)  Dubai (DXB)  ←
         2h 30m layover
  09:00  ✈ Flight    Dubai (DXB) → Rome (FCO)
         Emirates EK097 · 6h 45m  →

── Day 3 · Fri 14 March · Rome ─────────────────
  15:45  ✈ (arriving)  Rome Fiumicino  ←
  17:00  Activity    Check in — Hotel Minerva
  19:30  Activity    Dinner at Tonnarello
```

- Read-only — click through to day page to add or edit items
- Cross-day transport appears on both the departure and arrival day sections
- Days with nothing planned show a subtle "Nothing planned · Open day" prompt
- Transport with no `departure_day_id` appears in an "Unscheduled Transport" section at the bottom

---

## What Gets Removed

### Backend
- Models: `journey.py`, `journey_segment.py`, `journey_stop.py`, `segment_option.py`, `stop_option.py`
- Routers: `journeys.py`, `journey_segments.py`, `journey_stops.py`, `segment_options.py`, `stop_options.py`
- All Pydantic schemas for the above
- DB tables: `journeys`, `journey_segments`, `journey_stops`, `segment_options`, `stop_options`
- Expense FK columns: `segment_id`, `segment_option_id`, `stop_option_id`

### Frontend
- `frontend/components/journey-segments/` — entire directory
- `frontend/components/journey-stops/` — entire directory
- `frontend/components/journeys/JourneyForm.tsx`
- `frontend/components/journeys/InlineSegmentList.tsx`
- Journey/segment/stop types from `frontend/lib/types.ts`

### What Stays (repurposed)
- `JourneyItem.tsx` → `TransportItem.tsx`
- `JourneyList.tsx` → `TransportList.tsx`
- `useJourneys.ts` → `useTransport.ts`
- All Day Builder components — untouched
- Expense model — stays, loses segment FKs only

---

## New Components & Files

### Backend
- `app/models/trip_transport.py` — TripTransport model
- `app/models/transport_option.py` — TransportOption model
- `app/schemas/trip_transport.py` — Pydantic schemas
- `app/routers/trip_transports.py` — CRUD endpoints
- `app/routers/transport_options.py` — CRUD endpoints
- DB migration: create new tables, drop old tables, update expense FKs

### Frontend
- `frontend/components/transport/TransportItem.tsx` — Transport block on day timeline
- `frontend/components/transport/TransportForm.tsx` — Add/edit transport form
- `frontend/components/transport/TransportOptionList.tsx` — Comparison view
- `frontend/components/transport/TransportOptionForm.tsx` — Add/edit option form
- `frontend/components/transport/useTransport.ts` — Data hook
- `frontend/components/trip/TripTimeline.tsx` — Full trip chronological timeline
- Updates to `DayTimeline.tsx` — render transport items alongside activities
- Updates to `frontend/lib/types.ts` — new transport types
- Updates to `frontend/lib/api.ts` — new transport API calls

---

## Acceptance Criteria

- [ ] Can add a transport item to a day with type, origin, destination, times, carrier, reference, cost
- [ ] Type-specific metadata fields appear conditionally (distance for drive, frequency for train/bus)
- [ ] Cross-day transport appears on both departure and arrival day pages
- [ ] Can add multiple options to a transport item and compare by cost/duration
- [ ] Selecting an option marks it selected and displays its details on the transport item
- [ ] Trip Timeline tab shows all days with activities and transport in chronological order
- [ ] All old journey/segment/stop UI is removed
- [ ] Expenses remain intact (trip-level links preserved)