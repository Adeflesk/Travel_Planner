# Design: RoadTripBuilder

**Date:** 2026-02-22
**Status:** Approved
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

RoadTripBuilder is a two-column layout — no wizard steps, no Previous/Next:

```
┌────────────────────────┐  ┌──────────────────────────────────┐
│  YOUR ROUTE            │  │  Leg 1 · Start → Stop 1         │
│                        │  │  ──────────────────────────────  │
│  🛣️ Start → Stop 1  ●  │  │  Mode  [Drive (own car)      ▼] │
│  │                     │  │                                  │
│  📍 Stop 1             │  │  Distance  [___________]  km     │
│  │                     │  │                                  │
│  🛣️ Stop 1 → Stop 2   │  │  Route notes                     │
│  │                     │  │  [_____________________________] │
│  📍 Stop 2             │  │  [_____________________________] │
│  │                     │  │                                  │
│  🛣️ Stop 2 → End      │  │  Transport options               │
│                        │  │  ┌──────────┐ ┌──────────┐      │
│  [+ Add stop]          │  │  │ Drive    │ │ Uber     │      │
└────────────────────────┘  │  │ 2h 00m   │ │ 2h 10m   │      │
                            │  └──────────┘ └──────────┘      │
                            │                                  │
                            │  Cost  [_____]  [USD ▼]          │
                            │  ☐ Booked  ☐ Paid               │
                            └──────────────────────────────────┘
```

- **Left column (RoadTripTimeline):** vertical timeline of alternating LEG rows (🛣️) and STOP rows (📍). Clicking a row selects it (highlighted + dot indicator).
- **Right panel (inline in RoadTripBuilder):** context-aware form depending on the selected segment type:
  - **LEG selected:** LegForm — mode dropdown, estimated distance, route notes, TransportOptionCards
  - **STOP selected:** StopForm — location name, pass-through toggle, StopActivitiesList
- **"+ Add stop":** inserts a new STOP + LEG pair after the last stop, selects the new STOP.
- **Review step:** road trips skip Step 3 (the timeline view already shows the complete route).
- The "Save" button is in JourneyForm — unchanged.

---

## Segment Types in RoadTripBuilder

| Position | Type | Form shown |
|---|---|---|
| Connecting legs | `LEG` | LegForm |
| Stops | `STOP` | StopForm |

No TRANSFER, FLIGHT, BUS, RAIL, LAYOVER forms needed — RoadTripBuilder only handles LEG and STOP.

---

## New Files

| File | Purpose |
|---|---|
| `frontend/components/journey-segments/RoadTripBuilder.tsx` | Main component — two-column layout, selected segment state, inline panel logic |
| `frontend/components/journey-segments/RoadTripTimeline.tsx` | Left column — LEG/STOP rows, click to select |
| `frontend/components/journey-segments/LegForm.tsx` | LEG form: mode, distance, route notes, TransportOptionCards, cost |
| `frontend/components/journey-segments/StopForm.tsx` | STOP form: location, pass-through toggle, StopActivitiesList, cost |

## Modified Files

| File | Change |
|---|---|
| `frontend/components/journey-segments/useSegmentWizard.ts` | Move `selectedIntent` into hook state; expose `intent` and `setIntent` |
| `frontend/components/journey-segments/SegmentWizard.tsx` | Remove local `selectedIntent` state; use hook's `intent`; branch Step 2 to `<RoadTripBuilder>` |
| `frontend/components/journey-segments/index.ts` | Export `RoadTripBuilder` |

## Unchanged Files

Everything else: `JourneyForm.tsx`, `useSegmentBuilder.ts`, `SegmentLocationInputs.tsx`, `SegmentTimingEditor.tsx`, `TransportOptionCards.tsx`, `StopActivitiesList.tsx`, `SegmentCard.tsx`, `segment-templates.ts`, all backend files.

---

## RoadTripBuilder Props

Same interface as SegmentWizard (drop-in for Step 2):

```ts
interface RoadTripBuilderProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
  onDone: () => void; // advances SegmentWizard to Step 3 or saves directly
}
```

---

## Verification

1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run lint` — no new warnings
3. Manual: pick ROAD_TRIP template → see two-column builder with LEG 🛣️ and STOP 📍 rows
4. Manual: click a LEG row → right panel shows mode/distance/route notes/transport cards (no airport fields)
5. Manual: click a STOP row → right panel shows activities list
6. Manual: click "+ Add stop" → new STOP + LEG row appears, new STOP is selected
7. Manual: go back to Step 1, repick ROAD_TRIP_WITH_STOPS → RoadTripBuilder resets with the new segments
8. Manual: pick AIR_TRAVEL template → existing step-by-step wizard unchanged (no regression)
9. `pytest tests/ -x -q` — backend tests unaffected
