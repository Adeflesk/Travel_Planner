# Design: RoadTripBuilder

**Date:** 2026-02-22
**Status:** Implemented
**Context:** Follows on from the LEG segment type addition (commits 7e086970, c4cff27c).
**Related doc:** `docs/plans/segment-builder-architecture.md`

---

## Problem

The SegmentWizard uses a unified `SegmentDetailsForm` with conditional rendering for each segment type. For road trip journeys, users see TRANSFER/LEG forms alongside fields designed for airport transfers (pickup/dropoff notes, parking) — wrong mental model, wrong fields.

The architecture review (`docs/plans/segment-builder-architecture.md`) recommends specialised builders per journey mode so forms are purpose-built, not conditional.

---

## Solution

Add a `RoadTripBuilder` component — a two-column, timeline-first UI specifically for road trip journeys. It replaces the SegmentWizard's Step 2 when the intent is ROAD_TRIP or ROAD_TRIP_WITH_STOPS.

---

## Architecture

**No changes to `JourneyForm.tsx`** — it still just renders `<SegmentWizard>`.

The branching lives entirely inside SegmentWizard's Step 2:

```
SegmentWizard Step 1 (template picker — unchanged)
  └── User picks ROAD_TRIP or ROAD_TRIP_WITH_STOPS
        → applyIntent() creates pre-populated LEG/STOP segments
        → Step 2 renders <RoadTripBuilder>
  └── User picks anything else (AIR_TRAVEL, SIMPLE, MULTI_STOP, etc.)
        → Step 2 renders the existing step-by-step editor (unchanged)
```

**Intent state moved to the hook:** `selectedIntent` moves from local state in `SegmentWizard.tsx` into `useSegmentWizard.ts`. The hook now exposes `intent` and `setIntent`. This ensures:
- If the user goes back to Step 1 and repicks, the intent updates and RoadTripBuilder re-initialises with the new segments.
- The check `intent === 'ROAD_TRIP' || intent === 'ROAD_TRIP_WITH_STOPS'` in Step 2 is reactive.

---

## UI Layout

RoadTripBuilder is a two-column layout with sequential Previous/Next navigation in the right panel and a "Review & Save" footer:

```
┌────────────────────────┐  ┌──────────────────────────────────┐
│  YOUR ROUTE            │  │  Leg 1 · Start → Stop 1         │
│                        │  │  ──────────────────────────────  │
│  🛣️ Start → Stop 1  ●  │  │  Mode  [Drive (own car)      ▼] │
│  │                     │  │                                  │
│  📍 Stop 1             │  │  Distance  [___________]  km     │
│  │                     │  │                                  │
│  🛣️ Stop 1 → Stop 2   │  │  Start time  [2026-03-01 09:00]  │
│  │                     │  │  End time    [2026-03-01 11:00]  │
│  📍 Stop 2             │  │                                  │
│  │                     │  │  Route notes                     │
│  🛣️ Stop 2 → End      │  │  [_____________________________] │
│                        │  │                                  │
│  [+ Add stop]          │  │  ← Previous    1 / 5    Next →  │
└────────────────────────┘  └──────────────────────────────────┘
                            ┌──────────────────────────────────┐
                            │  3 segments planned  Review & Save → │
                            └──────────────────────────────────┘
```

- **Left column (RoadTripTimeline):** vertical timeline of alternating LEG rows (🛣️) and STOP rows (📍). Clicking a row selects it (highlighted + dot indicator). Clicking is non-destructive — it only fills empty times, never overwrites user-set times.
- **Right panel (inline in RoadTripBuilder):** context-aware form depending on the selected segment type:
  - **LEG selected:** LegForm — mode dropdown, estimated distance, route notes, TransportOptionCards, timing
  - **STOP selected:** StopForm — location name, timing, pass-through toggle, StopActivitiesList
- **Previous / Next navigation:** sequential step-through inside the right panel. **Next → always propagates time** from the current segment's end time to the next segment's start time (see Time Propagation below).
- **"+ Add stop":** inserts a new STOP + LEG pair after the last stop, selects the new STOP.
- **"Review & Save →":** advances SegmentWizard to Step 3 (review + segment summary), from which the user clicks "Save Journey".

---

## Segment Types in RoadTripBuilder

| Position | Type | Form shown |
|---|---|---|
| Connecting legs | `LEG` | LegForm |
| Stops | `STOP` | StopForm |

No TRANSFER, FLIGHT, BUS, RAIL, LAYOVER forms needed — RoadTripBuilder only handles LEG and STOP.

**Note:** `segment-templates.ts` was updated so that ROAD_TRIP and ROAD_TRIP_WITH_STOPS templates create `LEG` segments (not `TRANSFER`). The `buildTransferSegment` helper was removed as unused.

---

## Time Propagation

When the user clicks **Next →**, the builder automatically chains times forward:

- `next.start_datetime` ← `current.end_datetime`
- `next.end_datetime` ← `next.start_datetime + 2 hours` (via `defaultEndTime`)

This uses **`force=true`** — it always overwrites, even if the template pre-filled a default. This prevents the template's dummy values from blocking chaining.

Clicking the left timeline or **← Previous** uses **`force=false`** — it only fills if the target has no start time yet, so it never overwrites a time the user deliberately set.

### datetime-utils.ts — the reusable pattern

All future forms that need datetime arithmetic should import from `frontend/lib/datetime-utils.ts`:

```ts
import { defaultEndTime, addHours } from '@/lib/datetime-utils';

// Default end = start + 2 h (DEFAULT_SEGMENT_DURATION_HOURS)
const end = defaultEndTime(segment.start_datetime);

// Custom duration
const end = defaultEndTime(segment.start_datetime, 0.5); // 30-min stop
const end = defaultEndTime(segment.start_datetime, 8);   // overnight leg

// Raw offset
const later = addHours(isoString, 3);
```

When building any future segment builder:
1. Import `defaultEndTime` — don't inline `new Date(...).getTime() + hours * 60 * 60 * 1000`
2. Seed `end_datetime` whenever `start_datetime` is set programmatically
3. Use `force=true` on sequential Next navigation, `force=false` on direct timeline jumps

---

## Files

### New Files

| File | Purpose |
|---|---|
| `frontend/components/journey-segments/RoadTripBuilder.tsx` | Main component — two-column layout, segment selection, time propagation, navigation |
| `frontend/components/journey-segments/RoadTripTimeline.tsx` | Left column — LEG/STOP rows, click to select |
| `frontend/components/journey-segments/LegForm.tsx` | LEG form: mode, distance, route notes, TransportOptionCards, timing, cost |
| `frontend/components/journey-segments/StopForm.tsx` | STOP form: location, timing, pass-through toggle, StopActivitiesList |
| `frontend/lib/datetime-utils.ts` | Shared datetime helpers: `addHours`, `defaultEndTime` |

### Modified Files

| File | Change |
|---|---|
| `frontend/components/journey-segments/useSegmentWizard.ts` | Move `selectedIntent` into hook state; expose `intent`, `setIntent`, `isRoadTrip` |
| `frontend/components/journey-segments/SegmentWizard.tsx` | Remove local `selectedIntent`; use hook intent; branch Step 2 to `<RoadTripBuilder>`; pass `onBack` and `onDone` |
| `frontend/components/journey-segments/index.ts` | Export `RoadTripBuilder` |
| `frontend/lib/segment-templates.ts` | ROAD_TRIP and ROAD_TRIP_WITH_STOPS now produce `LEG` segments; removed unused `buildTransferSegment` |

### Unchanged Files

`JourneyForm.tsx`, `useSegmentBuilder.ts`, `SegmentLocationInputs.tsx`, `SegmentTimingEditor.tsx`, `TransportOptionCards.tsx`, `StopActivitiesList.tsx`, `SegmentCard.tsx`, all backend files.

---

## RoadTripBuilder Props

```ts
interface RoadTripBuilderProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
  onBack: () => void;  // returns to Step 1 template picker
  onDone: () => void;  // advances to Step 3 review
}
```

---

## Verification

1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run lint` — no new warnings in the new files
3. Manual: pick ROAD_TRIP template → see two-column builder with LEG 🛣️ and STOP 📍 rows
4. Manual: click a LEG row → right panel shows mode/distance/route notes/transport cards (no airport fields)
5. Manual: click a STOP row → right panel shows stop name, timing, activities list
6. Manual: set Leg 1 end time, click Next → → Stop 1 start time auto-fills, end time = start + 2 h
7. Manual: click "+ Add stop" → new STOP + LEG row appears, new STOP is selected
8. Manual: "← Change template" → returns to Step 1 template picker
9. Manual: "Review & Save →" → advances to Step 3; "Save Journey" persists the journey
10. Manual: pick AIR_TRAVEL template → existing step-by-step wizard unchanged (no regression)
11. `pytest tests/ -x -q` — backend tests unaffected
