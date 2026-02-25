# Segment Builder Optimisation Plan

## Context
The Segment Builder has grown into an over-burdened design:
- `SegmentCard.tsx` is 739 lines — a god component mixing display, editing, flight fields, transfer modes, stop activities, and transport alternatives all in one file
- Transport comparison (train/bus/taxi) exists in the data model but has no dedicated UI — users see a plain text list
- The builder shows all segments at once with no guidance, making complex multi-leg journeys (road trips, multi-stop flights) cognitively overwhelming

**Goal:** Equal parts UX improvement + code quality. Build a step-by-step wizard for route construction, introduce a card-based transport option picker, and split SegmentCard into focused sub-components.

---

## Recommended Order

### Phase 1 — Refactor SegmentCard (foundation)
Do this first so the wizard and option cards are built on clean components.

Split `frontend/components/journey-segments/SegmentCard.tsx` (739 lines) into:

| New file | Responsibility |
|---|---|
| `SegmentCard.tsx` | Shell only: collapse/expand, header summary, renders sub-components |
| `SegmentLocationInputs.tsx` | Origin + destination fields (airport autocomplete or free text) |
| `SegmentTimingEditor.tsx` | Start/end datetime pickers with timezone labels |
| `SegmentDetailsForm.tsx` | Type-specific fields: flight (carrier/number/seat), transfer (mode/parking/provider/notes), stop (pass-through) |
| `TransportOptionCards.tsx` | **New** — card-based transport comparison (see Phase 2) |
| `StopActivitiesList.tsx` | Inline add/remove/edit for draft_stop_options (activities/meals at STOP segments) |

No logic changes in this phase — purely structural split. Each sub-component receives props from SegmentCard and emits onChange callbacks up.

**Key files:**
- `frontend/components/journey-segments/SegmentCard.tsx` — refactor
- `frontend/components/journey-segments/index.ts` — add new exports

---

### Phase 2 — Transport Option Cards
Replace the current plain list in `metadata.draft_segment_options` with a visual card picker.

**New component:** `frontend/components/journey-segments/TransportOptionCards.tsx`

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ✓ Drive self    │  │   Uber          │  │   Taxi          │
│  ⏱ 2h 00m      │  │  ⏱ 2h 10m      │  │  ⏱ 2h 20m      │
│  💰 —          │  │  💰 £35         │  │  💰 £45         │
│  [Edit] [✕]     │  │  [Edit] [✕]     │  │  [Edit] [✕]     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
  ⚡ Fastest            ☑ Selected          💸 Cheapest
                  [+ Add option]
```

**Behaviour:**
- Shown for TRANSFER, BUS, RAIL segments when `draft_segment_options` is non-empty (or always, as an add prompt)
- Clicking a card selects it: highlights with a border + checkmark, copies its cost into the segment cost field and its name into the provider field
- Fastest card gets a ⚡ badge (lowest `estimated_duration`), cheapest gets 💸 badge (lowest `cost` where cost > 0)
- "+ Add option" button opens an inline mini-form (name, provider, duration, cost, currency, notes)
- Each card has an edit (pencil) and delete (✕) icon
- Currently selected card shows `✓` prominently

**Props:**
```ts
interface TransportOptionCardsProps {
  options: DraftSegmentOption[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onChange: (options: DraftSegmentOption[]) => void;
}
```

**Reuses:** `DraftSegmentOption` type from `frontend/lib/segment-templates.ts`

---

### Phase 3 — Step-by-Step Wizard
New container that replaces `SegmentBuilder.tsx` in `JourneyForm.tsx`.

**New component:** `frontend/components/journey-segments/SegmentWizard.tsx`

**3 steps:**

#### Step 1 — Template picker
- Reuse existing `intentOptions` array from `SegmentBuilder.tsx` (6 templates with icons/descriptions)
- Show a preview blurb under each: "Creates 3 segments: Transfer → Flight → Transfer"
- "Use this template" applies template and advances to Step 2
- Or "Start blank" skips to Step 2 with a single empty segment

#### Step 2 — Fill in segments (one at a time)
```
[Step 1: Template] → [Step 2: Segments ●] → [Step 3: Review]

  Segment 2 of 4          ← Previous   Next →
  ┌─────────────────────────────────────────────┐
  │  ✈ FLIGHT                                   │
  │  Origin: [London Heathrow (LHR)          ]  │
  │  Destination: [New York JFK              ]  │
  │  Depart: [2026-06-10 09:30]                 │
  │  Arrive: [2026-06-10 13:00]                 │
  │  Carrier / Flight No: [BA  ] [BA0117     ]  │
  └─────────────────────────────────────────────┘
  [+ Add segment]  [Remove this segment]
```
- One segment fully expanded per step (no collapse)
- Progress: "Segment N of M" + progress bar
- Prev / Next navigation — validates current segment before advancing (origin + destination non-empty)
- Segment is always shown expanded (remove the expand/collapse for wizard mode)
- "Add segment" inserts after current, "Remove" deletes current segment
- Transport option cards shown inline for applicable segment types

#### Step 3 — Review
- Timeline-style read-only list of all segments:
  - Icon + type label, origin → destination, duration, cost/currency, selected transport option
- "Edit" button on each jumps back to Step 2 at that segment index
- "Save Journey" calls the existing submit handler in `useJourneyForm`
- "Back" returns to Step 2 at the last segment

**Wizard state hook:** `useSegmentWizard.ts`
```ts
{ step, currentSegmentIndex, goToStep, goToSegment, canAdvance }
```

**Props (same interface as current SegmentBuilder):**
```ts
interface SegmentWizardProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
}
```

**Reuses:**
- `useSegmentBuilder.ts` — all segment manipulation logic (no changes needed)
- `createSegmentTemplate()` from `frontend/lib/segment-templates.ts`
- All refactored SegmentCard sub-components from Phase 1

---

## Files to Create
| File | Phase |
|---|---|
| `frontend/components/journey-segments/SegmentLocationInputs.tsx` | 1 |
| `frontend/components/journey-segments/SegmentTimingEditor.tsx` | 1 |
| `frontend/components/journey-segments/SegmentDetailsForm.tsx` | 1 |
| `frontend/components/journey-segments/StopActivitiesList.tsx` | 1 |
| `frontend/components/journey-segments/TransportOptionCards.tsx` | 2 |
| `frontend/components/journey-segments/SegmentWizard.tsx` | 3 |
| `frontend/components/journey-segments/useSegmentWizard.ts` | 3 |
| `frontend/components/journey-segments/JourneyReview.tsx` | 3 |

## Files to Modify
| File | Change |
|---|---|
| `frontend/components/journey-segments/SegmentCard.tsx` | Slim down to shell, delegate to sub-components |
| `frontend/components/journey-segments/index.ts` | Add new exports |
| `frontend/components/journeys/JourneyForm.tsx` | Swap `<SegmentBuilder>` for `<SegmentWizard>` |
| `frontend/lib/segment-templates.ts` | No changes needed |
| `frontend/components/journey-segments/useSegmentBuilder.ts` | No changes needed |

## Files Unchanged
- All backend files — no API or schema changes required
- `useJourneyForm.ts` — submit logic stays the same
- `segment-templates.ts` — template data stays the same

---

## Verification
1. `npx tsc --noEmit` — no TypeScript errors
2. `npm run lint` — no new warnings in modified files
3. Manual test: create a ROAD_TRIP journey using the wizard, select "Uber" from transport cards, save → verify segments persist correctly in DB
4. Manual test: edit existing journey → wizard loads at Step 2 with existing segments pre-filled
5. `pytest tests/ -x -q` — all 317 backend tests still pass
6. Run Playwright E2E: `npm run test:e2e` against local dev server
