# Journey Segments Spec

## Summary
Introduce a segment-based journey model and a front-end form builder that supports simple, multi-stop, air travel with layovers, and mixed itineraries without overwhelming the user.

## Goals
- Support A -> B, multi-stop, and air travel with layovers using a consistent model.
- Keep the form simple using templates and progressive disclosure.
- Enforce continuity and buffer-time validation.

## Non-Goals
- Full booking workflow (tickets, payments).
- Route optimization or schedule suggestions.

## User Stories
- As a user, I can create a simple trip from A to B with minimal fields.
- As a user, I can add one or more stops with activities between legs.
- As a user, I can add air travel with transfers and layovers.
- As a user, I can mix modes like bus -> stop -> rail.

## Data Model (Frontend State)

### Journey
- `id: string`
- `tripId: string`
- `name?: string`
- `segments: Segment[]` (ordered)
- `notes?: string`

### Segment (base)
- `id: string`
- `type: SegmentType`
- `origin: LocationRef`
- `destination: LocationRef`
- `startTime: string` (ISO, with timezone)
- `endTime: string` (ISO, with timezone)
- `timezone?: string`
- `metadata?: Record<string, string | number | boolean | null>`

### Segment Types
- `TRANSFER` (car/bus/taxi/shuttle)
- `BUS`
- `RAIL`
- `FLIGHT`
- `LAYOVER`
- `STOP`

### LocationRef
- `type: "destination" | "custom"`
- `destinationId?: string`
- `name?: string`

### Type-Specific Metadata (examples)
- Flight: `carrier`, `flightNumber`, `terminal`, `gate`, `seat`, `baggage`
- Transfer: `mode`, `provider`, `pickupNotes`, `dropoffNotes`
- Rail/Bus: `line`, `coach`, `seat`
- Layover: `locationName`, `notes`
- Stop: `activityId?`, `title`, `category`

## UI/UX Spec

### Intent Picker (Template Selection)
- Road/Rail
- Air Travel
- Mixed/Custom

### Template Behavior
- Road/Rail: one segment (default type `TRANSFER`), minimal fields.
- Multi-Stop: starts with two segments and one `STOP` inserted between; user can add more stops.
- Air Travel: preconfigured group `TRANSFER -> FLIGHT -> TRANSFER` with optional `LAYOVER` between flights.
- Mixed/Custom: starts with empty list; user adds segments from a type picker.

### Segment Cards
- Compact view: origin, destination, start/end, type selector.
- Expandable details drawer with type-specific fields.

### Progressive Disclosure
- Only show essential fields by default.
- Show advanced fields on expand.

## Validation Rules
- Continuity: each segment destination must match next segment origin.
- Buffer time: minimum time between segments (configurable, default 30 minutes).
- Timezone: start/end must include timezone; block save if missing.
- Zero-duration stops: allowed only if explicitly marked as pass-through.

## Error/Warning Messaging
- Continuity violation: inline error on the second segment.
- Buffer violation: warning with suggested minimum.
- Timezone missing: blocking error on save.

## Example Templates

### Simple A -> B
- `TRANSFER` segment

### Multi-Stop
- `TRANSFER` A -> Stop
- `STOP` at Stop
- `TRANSFER` Stop -> B

### Air Travel (no layover)
- `TRANSFER` Home -> Airport
- `FLIGHT` Airport -> Airport
- `TRANSFER` Airport -> Hotel

### Air Travel (with layover)
- `TRANSFER` Home -> Airport
- `FLIGHT` A -> Hub
- `LAYOVER` Hub
- `FLIGHT` Hub -> B
- `TRANSFER` Airport -> Hotel

## Open Questions
- Should STOP segments allow free-text locations or only destinations?
- Should the backend normalize `TRANSFER`/`BUS`/`RAIL` under a single `TRANSIT` type?
- Do we need a global per-trip buffer policy or per-segment overrides?

## Migration Plan

### Option A: New `journey_segments` Table (recommended)

#### Schema (SQLAlchemy)
- `id: int`
- `journey_id: int (FK -> journeys.id)`
- `segment_type: string` (TRANSFER, BUS, RAIL, FLIGHT, LAYOVER, STOP)
- `origin_id: int?` / `origin_name: string?`
- `destination_id: int?` / `destination_name: string?`
- `start_datetime: datetime?`
- `end_datetime: datetime?`
- `origin_timezone: string?`
- `destination_timezone: string?`
- `metadata_json: JSON?`
- `order: int`

#### Backend Changes
- Add `JourneySegment` model and relationship in `Journey`.
- Add Pydantic schemas: `JourneySegmentBase`, `JourneySegmentCreate`, `JourneySegmentUpdate`, `JourneySegment`.
- Extend `JourneyCreate` / `JourneyUpdate` to accept `segments: list[JourneySegmentCreate]`.
- Service layer validates continuity and buffer rules before insert/update.
- Add endpoints:
	- `POST /journeys/{journey_id}/segments/`
	- `GET /journeys/{journey_id}/segments/`
	- `PUT /journeys/{journey_id}/segments/{segment_id}`
	- `DELETE /journeys/{journey_id}/segments/{segment_id}`
	- `PATCH /journeys/{journey_id}/segments/reorder`

#### Frontend Changes
- Add `Segment` types and `segments: Segment[]` to `Journey`.
- Update journey forms to render segment list and templates.

### Option B: `segments_json` Column on `journeys` (fastest)

#### Schema (SQLAlchemy)
- Add `segments_json: JSON` to `Journey`.

#### Backend Changes
- Extend `JourneyCreate` / `JourneyUpdate` to accept `segments: list[Segment]`.
- Validate continuity and buffer rules in service layer.
- Save segment list as JSON blob in `segments_json`.

#### Frontend Changes
- Same as Option A; only API changes differ.

## API Payload Shape (Proposed)

### JourneyCreate
```json
{
	"trip_id": 1,
	"transport_mode": "mixed",
	"segments": [
		{
			"segment_type": "TRANSFER",
			"origin": {"type": "custom", "name": "Home"},
			"destination": {"type": "custom", "name": "JFK"},
			"start_datetime": "2026-02-14T06:00:00-05:00",
			"end_datetime": "2026-02-14T07:00:00-05:00",
			"metadata": {"mode": "taxi"},
			"order": 0
		},
		{
			"segment_type": "FLIGHT",
			"origin": {"type": "custom", "name": "JFK"},
			"destination": {"type": "custom", "name": "LAX"},
			"start_datetime": "2026-02-14T08:30:00-05:00",
			"end_datetime": "2026-02-14T11:30:00-08:00",
			"metadata": {"carrier": "Delta", "flightNumber": "DL123"},
			"order": 1
		}
	]
}
```

### JourneyUpdate (partial)
```json
{
	"segments": [
		{
			"id": 10,
			"segment_type": "FLIGHT",
			"metadata": {"gate": "B12"}
		}
	]
}
```

## Backend Validation Rules
- Continuity: `segment[i].destination` must match `segment[i+1].origin`.
- Buffer: `segment[i].end_datetime + min_buffer <= segment[i+1].start_datetime`.
- Timezone required for any segment with start/end.
- Stop/layover duration must be >= 0; zero duration requires explicit `metadata.passThrough = true`.

## Migration Compatibility Notes
- Existing journey stops and layovers can be mapped to segments during migration (optional).
- The current journey model can remain as the “summary” row while segments become the detailed itinerary.

## Migration Checklist
1. Decide storage approach (new `journey_segments` table vs `segments_json`).
2. Add schema changes and migrations.
3. Add Pydantic schemas for segments and update journey schemas.
4. Implement service-layer validation (continuity, buffer, timezone).
5. Extend journey endpoints to accept/return segments.
6. Update frontend types and add Zod validation.
7. Build the segment form builder (templates + progressive disclosure).
8. Backfill existing journeys into segments (optional).
9. Add tests for segment scenarios (simple, multi-stop, air w/ layovers, mixed).
10. Rollout in phases with feature flag if needed.

## Migration Draft (Manual SQL Script)

Create a new migration file, e.g. `migrations/add_journey_segments.py` with SQL similar to:

```sql
CREATE TABLE journey_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  segment_type VARCHAR(20) NOT NULL,
  origin_id INTEGER REFERENCES destinations(id),
  origin_name VARCHAR(200),
  destination_id INTEGER REFERENCES destinations(id),
  destination_name VARCHAR(200),
  start_datetime DATETIME,
  end_datetime DATETIME,
  origin_timezone VARCHAR(50),
  destination_timezone VARCHAR(50),
  metadata_json TEXT,
  order_index INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX ix_journey_segments_journey_id ON journey_segments (journey_id);
CREATE INDEX ix_journey_segments_order ON journey_segments (journey_id, order_index);
```

Notes:
- Use `metadata_json` as TEXT for SQLite compatibility and serialize JSON in the app layer.
- If using Postgres in production, map `metadata_json` to JSONB in SQLAlchemy.

## Backfill Plan (Optional)

Goal: create at least one segment per existing journey and map stops/layovers into segments where possible.

### Strategy
1. For every journey, create a base segment using:
	- `segment_type` from `journey.transport_mode` (mapped to TRANSFER/RAIL/BUS/FLIGHT).
	- `origin_id`/`origin_name` from journey.
	- `destination_id`/`destination_name` from journey.
	- `start_datetime` from `departure_datetime`.
	- `end_datetime` from `arrival_datetime`.
	- `origin_timezone`/`destination_timezone` from journey.
	- `order_index = 0`.

2. For each journey stop, insert a `STOP` segment:
	- `segment_type = STOP`.
	- `origin_name = stop.name`, `destination_name = stop.name`.
	- `start_datetime = planned_arrival`, `end_datetime = planned_departure`.
	- `order_index` placed between legs by `stop.order`.

3. For each flight layover, insert a `LAYOVER` segment:
	- `segment_type = LAYOVER`.
	- `origin_name = airport_name`, `destination_name = airport_name`.
	- `start_datetime = arrival_datetime`, `end_datetime = departure_datetime`.
	- `order_index` placed between legs by `layover.order`.

4. Recalculate `order_index` so segments are ordered by time where possible:
	- Primary: `start_datetime`.
	- Secondary: existing order fields.

### Notes
- This backfill creates a useful starting point but will not perfectly represent multi-leg journeys.
- Consider marking backfilled segments with `metadata_json: {"backfilled": true}`.

## Acceptance Criteria
- Users can create all listed journey styles without seeing irrelevant fields.
- UI enforces continuity and buffer-time rules.
- Segment list supports reordering and deletion.
- Data model can represent mixed modes and air layovers.
