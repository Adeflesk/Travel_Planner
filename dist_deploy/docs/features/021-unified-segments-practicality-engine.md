# 021: Unified Segment Model + Expense Links + Practicality Engine

## Context

The journey UI currently has two parallel systems:
1. **JourneySegments** (transport legs) with **SegmentOptions** (transport alternatives)
2. **JourneyStops** (places to pause) with **StopOptions** (activities/food at stops)

The SegmentBuilder already supports a `STOP` segment type, making JourneyStops redundant. The goal is to unify everything into segments, link expenses properly, and add a practicality engine that flags impractical days.

---

## Part 1: Frontend — Merge Journey Section into Segment Section

**Answer: Yes, simplify the journey section. Keep Journey as a lightweight container.**

**Decision: Strip down Journey model now.**

### Journey model keeps (container only)
- `id`, `trip_id`, `order`, `status`, `notes`
- `departure_datetime` (the day/time this journey starts — derived display)

### Journey model drops (moved to segments)
- `carrier`, `booking_reference`, `cost`, `currency` → segment metadata
- `distance_km`, `distance_miles`, `route_type`, `has_tolls`, `toll_cost`, `route_notes` → segment metadata
- `transport_mode` → derived from first segment type
- `origin_id/name`, `destination_id/name` → derived from first/last segment
- `arrival_datetime`, `estimated_duration_minutes` → derived from segments

### JourneyStop model — phased out
**Decision: Migrate to segments.** Add `segment_id` FK to StopOption. Stop-type segments replace JourneyStops. Remove JourneyStop model/router/service after migration.

### Frontend changes
- **JourneyItem.tsx**: Simplify to show journey date + inline segment list (no more separate "Manage Segments" page)
- **Remove**: The route details section, carrier/booking fields from journey level
- **JourneyStopsList/JourneyStopItem**: Replace with stop-type segments + StopOptions rendered inline under those segments
- **SegmentCard.tsx**: When `segment_type="stop"`, render StopOptions (activities, meals, sightseeing) inline below the segment
- **SegmentBuilder.tsx**: Add ability to insert STOP segments between transport segments with stop options

### Files to modify (frontend)
- `frontend/components/journeys/JourneyItem.tsx` — simplify, show segments inline
- `frontend/components/journeys/JourneyForm.tsx` — simplify, remove journey-level transport fields
- `frontend/components/journey-segments/SegmentCard.tsx` — render StopOptions for STOP segments
- `frontend/components/journey-segments/SegmentBuilder.tsx` — support adding stops with options
- `frontend/lib/types.ts` — update Journey type, add StopOption to segment types

---

## Part 2: Backend — Link StopOptions to Segments

### Model changes

**StopOption model** (`app/models/stop_option.py`):
- Add `segment_id` FK (nullable) → `journey_segments.id`
- Keep `stop_id` FK (nullable) for backward compat during transition
- StopOptions can now attach to a segment where `segment_type="stop"`

**JourneySegment model** (`app/models/journey_segment.py`):
- Add relationship: `stop_options` → StopOption (via segment_id)

**Expense model** (`app/models/expense.py`):
- Add `segment_option_id` FK (nullable) → `segment_options.id`
- Add `stop_option_id` FK (nullable) → `stop_options.id`
- Add relationships to both

### Schema changes

**ExpenseCreate/ExpenseUpdate** (`app/schemas/expense.py`):
- Add optional `segment_option_id` and `stop_option_id` fields

**StopOption schemas** (`app/schemas/stop_option.py`):
- Add optional `segment_id` field
- Add nested `expenses` list in response schema

### Files to modify (backend)
- `app/models/expense.py` — add FKs + relationships
- `app/models/journey_segment.py` — add stop_options relationship
- `app/models/stop_option.py` — add segment_id FK
- `app/schemas/expense.py` — add optional FK fields
- `app/schemas/stop_option.py` — add segment_id field
- `app/routers/stop_options.py` — support segment-based stop option CRUD
- `app/routers/expenses.py` — handle new FK fields on create/update

### Migration
- `migrations/add_expense_links_and_segment_stops.py` — ALTER TABLE for new FKs

---

## Part 3: Practicality Engine

### New service: `app/services/practicality_service.py`

```python
def get_journey_practicality(journey_id: int, db: Session) -> PracticalityResponse:
    """
    For a journey, sum up:
    - Time: selected segment option durations + stop option durations + buffers
    - Cost: selected segment option costs + stop option estimated costs

    Return flags if time > limit or cost > daily budget.
    """
```

#### Time Engine
```
For each segment in journey (ordered):
  if transport segment:
    + selected SegmentOption.estimated_duration (or segment duration from metadata)
  if stop segment:
    + sum of selected/planned StopOption.estimated_duration
  + buffer per transition (configurable, default 15 min)

Total → flag if > daily_time_limit (default 14 hours, user-configurable)
```

#### Budget Engine
```
For each segment in journey:
  if transport segment:
    + selected SegmentOption.cost
  if stop segment:
    + sum of selected StopOption.estimated_cost

Total → flag if > daily_budget_limit (from trip.budget / trip_days, or user-set)
```

### New schema: `app/schemas/practicality.py`

```python
class PracticalityResponse(BaseModel):
    journey_id: int
    total_duration_minutes: int
    total_cost: Decimal
    time_limit_minutes: int
    daily_budget: Decimal | None
    time_feasible: bool      # total_duration <= time_limit
    budget_feasible: bool    # total_cost <= daily_budget
    segments: list[SegmentPracticality]  # per-segment breakdown

class SegmentPracticality(BaseModel):
    segment_id: int
    segment_type: str
    duration_minutes: int
    cost: Decimal
    items: list[str]  # names of what's contributing
```

### New router endpoint
- `GET /api/journeys/{journey_id}/practicality` → returns PracticalityResponse

### Files to create
- `app/services/practicality_service.py`
- `app/schemas/practicality.py`

### Files to modify
- `app/routers/journeys.py` — add practicality endpoint

---

## Part 4: Frontend Practicality Display

- Add a **practicality bar** at the bottom of each journey card
- Shows: `12h 30m / 14h` time bar + `$245 / $300` budget bar
- Color-coded: green (feasible), amber (tight), red (over limit)
- Calls `GET /api/journeys/{journey_id}/practicality` when journey segments change

### Files to modify
- `frontend/components/journeys/JourneyItem.tsx` — add practicality bar
- `frontend/lib/api.ts` — add `getJourneyPracticality()` API call
- `frontend/lib/types.ts` — add PracticalityResponse type

---

## Implementation Order

1. **Backend models + migration** — Expense FKs, StopOption segment_id
2. **Backend schemas + routers** — Update CRUD for new fields
3. **Practicality service + endpoint** — New service and API
4. **Frontend segment unification** — Simplify JourneyItem, inline segments, stop options on STOP segments
5. **Frontend practicality bar** — Display feasibility indicators

---

## Verification

1. Create a journey with mixed segments (drive → stop → drive → stop)
2. Add stop options (lunch, activity) to stop segments
3. Add segment options (uber vs taxi) to transport segments
4. Verify practicality endpoint returns correct time/cost sums
5. Verify UI shows inline segments with stop options
6. Verify practicality bar updates when options change
7. Run existing tests + new practicality service tests
8. Run frontend lint (`npm run lint`) and backend lint
