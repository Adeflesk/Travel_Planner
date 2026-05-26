# Road Trip Workflow Improvements — Design Spec

**Date:** 2026-05-24  
**Status:** Approved  
**Scope:** Four targeted additions to make the app work well for self-drive road trips

---

## Background

The app was reviewed against a 13-day Southwest road trip itinerary (Las Vegas → Grand Canyon → Monument Valley → Moab → Zion). The core trip/destination/day/activity model fits well, but four concrete gaps were identified where the app strains or fails for this trip type:

1. No pre-trip booking checklist (permits, passes, tours booked months ahead)
2. Driving legs are not a first-class transport type
3. No structured day-level alerts (flash flood warnings, timing notes, etc.)
4. Activities with advance booking requirements have no deadline tracking

This spec addresses all four. Each feature is independent and self-contained.

---

## Feature 1: Pre-Trip Booking Checklist

### Purpose
Track tasks that must be done before departure — permits, passes, advance bookings — with deadlines and status. Surfaces in the dashboard when deadlines approach.

### Data Model

New model `PreTripTask`:

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK |
| `trip_id` | int FK | References `Trip` |
| `title` | str | Required |
| `description` | str \| None | Optional detail |
| `status` | enum | `pending` / `booked` / `paid` |
| `book_by_date` | date \| None | Deadline for action |
| `url` | str \| None | Booking link |
| `cost` | float \| None | Expected cost |
| `currency` | str \| None | Currency for cost |
| `sort_order` | int | Display order |
| `created_at` | datetime | Auto |

### API

New router `app/routers/pre_trip_tasks.py`:

```
GET    /trips/{trip_id}/pre-trip-tasks     List all tasks for a trip
POST   /trips/{trip_id}/pre-trip-tasks     Create a task
PATCH  /pre-trip-tasks/{task_id}          Update fields or reorder
DELETE /pre-trip-tasks/{task_id}          Delete a task
```

Pydantic schemas: `PreTripTaskCreate`, `PreTripTaskUpdate`, `PreTripTaskRead` in `app/schemas/pre_trip_task.py`.

### UI

- New collapsible "Before you go" panel on `/trips/[id]`, rendered above the destinations list
- Each task row: title, status pill (`pending` amber / `booked` blue / `paid` green), `book_by_date` if set
- Clicking a row expands inline to show description, URL (clickable), and cost
- "+ Add task" appends a new row in edit mode
- Status cycles on click: `pending` → `booked` → `paid`
- Dashboard `ActionItemsList` shows tasks where `status = "pending"` and `book_by_date <= today + 30 days`

New files: `PreTripTaskList.tsx`, `PreTripTaskRow.tsx`, `usePreTripTasks.ts`

---

## Feature 2: Driving Leg Transport Type

### Purpose
Road trip days start with a drive. The current transport model is built around bookable carriers (flights, trains). Driving needs a simpler entry that shows meaningfully on the day timeline.

### Data Model

No new model. Changes to `TripTransport`:

- `transport_type` is a `String(20)` column — `"drive"` is already a valid value (see model comment). No enum change needed.
- Add `waypoints` (text, nullable) — freeform intermediate stops, one per line (e.g. "Forrest Gump Point, US-163")
- Existing `notes` field carries highway/route info
- `carrier` and `reference` remain in the model but are hidden in the UI for drive type

Migration: add `waypoints` column to `trip_transports` table (nullable text) only.

### API

- `waypoints` added to `TripTransportCreate`, `TripTransportUpdate`, `TripTransportRead`
- `"driving"` added to transport type enum validation in schema
- No new endpoints

### UI

In `TransportForm.tsx`, when `transport_type === "driving"`:
- Hide `carrier` and `reference` fields
- Show `waypoints` textarea labelled "Intermediate stops (one per line)"
- Relabel origin/destination inputs as "From" / "To"

In `TransportBlock.tsx` on `DayTimeline`:
- Render car icon instead of plane for driving type
- Show waypoints as an indented list beneath the From → To line if present

---

## Feature 3: Day-Level Alerts

### Purpose
Each day in a road trip itinerary carries important warnings and tips that need visual prominence — flash flood risk, shuttle timing, fuel scarcity. These are distinct from general day notes.

### Data Model

Add `alerts` column to `TripDay` — a JSON array, nullable:

```python
alerts: list[dict] | None  # [{text: str, severity: "warning"|"info"|"tip"}]
```

Severity meanings:
- `warning` — time-sensitive or safety-critical (amber)
- `info` — useful context (blue)  
- `tip` — local knowledge, nice-to-know (green)

Alerts are always read and written as a complete array. No per-alert endpoints.

### API

- `alerts` added to `TripDayResponse` schema
- `PATCH /trip-days/{day_id}` already handles partial updates — `alerts` is included as a patchable field
- No new endpoints

### UI

On `/trips/[id]/days/[dayId]`, above the activity timeline:
- Alerts render as a stacked list of chips with colour-coded left border (amber/blue/green)
- "Add alert" button opens an inline form: text input + severity selector (3 options)
- Existing alerts are editable via a simple inline list editor — clicking an alert enters edit mode
- Alerts are saved as a full array on each edit (no partial patch per alert)

---

## Feature 4: Activity Book-By Date

### Purpose
Activities requiring advance booking (permits, tours, timed entries) need a deadline that surfaces as an action item before the trip.

### Data Model

Add `book_by_date` (date, nullable) to `DayActivity`.

Migration: add `book_by_date` column to `day_activities` table (nullable date).

### API

- `book_by_date` added to `DayActivityCreate`, `DayActivityUpdate`, `DayActivityResponse`
- Dashboard `GET /api/dashboard` action items query extended: activities where `booked = false AND book_by_date IS NOT NULL AND book_by_date <= today + 30 days`
- No new endpoints

### UI

In `ActivityForm.tsx`:
- Add date input labelled "Book by date" below the `booked` checkbox
- Field is only visible when `booked` is unchecked
- Clear the field automatically when `booked` is checked

In `DayTimeline`, `ActivityBlock.tsx`:
- Activities with an approaching `book_by_date` (within 30 days, not yet booked) show a small amber badge: "Book by {date}"

In dashboard `ActionItemsList`:
- New action item type for unbooked activities with approaching deadlines
- Format: "{activity title} — book by {date}" with link to the day view

---

## Migration Plan

All four features require database migrations. Apply in order:

1. Add `book_by_date` to `day_activities`
2. Add `alerts` JSON column to `trip_days`
3. Add `waypoints` to `trip_transports` (no enum change needed — `"drive"` already exists)
4. Create `pre_trip_tasks` table

Each migration is independent. Use `engine.dialect.name` to branch Postgres vs SQLite syntax where needed. Follow existing patterns in `migrations/`.

---

## Files Affected

**Backend:**
- `app/models/day_activity.py` — add `book_by_date`
- `app/models/trip_day.py` — add `alerts`
- `app/models/trip_transport.py` — add `waypoints`, extend enum
- `app/models/pre_trip_task.py` — new model
- `app/schemas/day_activity.py` — add `book_by_date`
- `app/schemas/trip_day.py` — add `alerts`
- `app/schemas/trip_transport.py` — add `waypoints`, extend enum
- `app/schemas/pre_trip_task.py` — new schemas
- `app/routers/pre_trip_tasks.py` — new router
- `app/routers/dashboard.py` — extend action items query
- `app/main.py` — register new router
- `migrations/` — 4 new migration scripts

**Frontend:**
- `frontend/lib/types.ts` — update `DayActivity`, `TripDay`, `TripTransport`; add `PreTripTask`
- `frontend/lib/api.ts` — add pre-trip task API calls
- `frontend/components/activities/ActivityForm.tsx` — add `book_by_date` field
- `frontend/components/activities/ActivityBlock.tsx` — add book-by badge
- `frontend/components/days/DayTimeline.tsx` — add alerts section
- `frontend/components/transport/TransportForm.tsx` — driving type variant
- `frontend/components/transport/TransportBlock.tsx` — driving display variant
- `frontend/components/pre-trip-tasks/PreTripTaskList.tsx` — new
- `frontend/components/pre-trip-tasks/PreTripTaskRow.tsx` — new
- `frontend/components/pre-trip-tasks/usePreTripTasks.ts` — new
- `frontend/components/dashboard/ActionItemsList.tsx` — extend for new item types
- `frontend/app/trips/[id]/page.tsx` — add "Before you go" panel

---

## Out of Scope

- Itinerary import (PDF or structured format)
- Multi-location day routing (day spanning 4 waypoints)
- Base-camp / multi-day stay concept
- Road trip mode as a distinct trip type
- Weather / flash flood data integration
