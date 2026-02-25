# LEG Segment Type Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `LEG` segment type for inter-city ground travel legs, replacing `TRANSFER` in road trip templates so users see context-appropriate fields (mode, route notes, distance) instead of airport-specific ones (parking, pickup/dropoff notes).

**Architecture:** Frontend-only change. `LEG` is added to the TypeScript `SegmentType` union; the backend already stores segment types as a plain `String(20)` column with no enum constraint, so 'LEG' persists without any migration. Five files touch: types, wizard visual config, card dropdown, details form, and templates.

**Tech Stack:** TypeScript, Next.js 14 (App Router), React, Tailwind CSS

**Design doc:** `docs/plans/2026-02-22-leg-segment-type-design.md`

---

## Before You Start

Run from the repo root:

```bash
cd frontend
npm run lint && npx tsc --noEmit
```

Both should pass clean before you make any changes. If they don't, stop and fix them first.

---

### Task 1: Add LEG to SegmentType

**Files:**
- Modify: `frontend/lib/types.ts:274`

**Step 1: Edit the SegmentType union**

In `frontend/lib/types.ts`, find line 274:

```ts
export type SegmentType = 'TRANSFER' | 'BUS' | 'RAIL' | 'FLIGHT' | 'LAYOVER' | 'STOP';
```

Change it to:

```ts
export type SegmentType = 'TRANSFER' | 'LEG' | 'BUS' | 'RAIL' | 'FLIGHT' | 'LAYOVER' | 'STOP';
```

**Step 2: Verify TypeScript now reports errors (expected)**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about `LEG` not being handled in switch/case or missing from `SEG_STYLE`. This confirms the type union change is live. The errors will be fixed in subsequent tasks.

**Step 3: Commit**

```bash
cd ..
git add frontend/lib/types.ts
git commit -m "feat: add LEG to SegmentType union"
```

---

### Task 2: Add LEG visual config to SegmentWizard and update road trip chains

**Files:**
- Modify: `frontend/components/journey-segments/SegmentWizard.tsx`

**Step 1: Add LEG to SEG_STYLE**

In `SegmentWizard.tsx`, find the `SEG_STYLE` object (starts around line 12). Add the `LEG` entry after `TRANSFER`:

```ts
export const SEG_STYLE: Record<string, { ... }> = {
  FLIGHT:   { dot: 'bg-sky-500',    badge: 'bg-sky-50 text-sky-700 border-sky-200',         border: 'border-l-sky-400',    icon: '✈️', label: 'Flight'   },
  TRANSFER: { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',   border: 'border-l-amber-400',  icon: '🚗', label: 'Transfer' },
  LEG:      { dot: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700 border-teal-200',      border: 'border-l-teal-400',   icon: '🛣️', label: 'Leg'      },
  BUS:      { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-400', icon: '🚌', label: 'Bus'  },
  RAIL:     { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200', border: 'border-l-violet-400', icon: '🚆', label: 'Rail'  },
  LAYOVER:  { dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600 border-slate-200',  border: 'border-l-slate-300',  icon: '⏸️', label: 'Layover' },
  STOP:     { dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700 border-rose-200',      border: 'border-l-rose-400',   icon: '📍', label: 'Stop'   },
};
```

**Step 2: Update INTENT_OPTIONS chains for road trip templates**

Find the `INTENT_OPTIONS` array. Update the three road trip entries' `chain` arrays:

```ts
// BEFORE:
{ value: 'MULTI_STOP', label: 'Multi-stop', icon: '📍', chain: ['TRANSFER', 'STOP', 'TRANSFER'], helper: '...' },
{ value: 'ROAD_TRIP', label: 'Road trip', icon: '🚗', chain: ['TRANSFER', 'STOP', 'TRANSFER', 'STOP', 'TRANSFER'], helper: '...' },
{ value: 'ROAD_TRIP_WITH_STOPS', label: 'Extended road trip', icon: '🗺️', chain: ['TRANSFER', 'STOP', 'TRANSFER', 'STOP', 'TRANSFER', 'STOP', 'TRANSFER'], helper: '...' },

// AFTER:
{ value: 'MULTI_STOP', label: 'Multi-stop', icon: '📍', chain: ['LEG', 'STOP', 'LEG'], helper: 'Leg, a stop, then onward leg.' },
{ value: 'ROAD_TRIP', label: 'Road trip', icon: '🚗', chain: ['LEG', 'STOP', 'LEG', 'STOP', 'LEG'], helper: 'Drive with stops and transport alternatives.' },
{ value: 'ROAD_TRIP_WITH_STOPS', label: 'Extended road trip', icon: '🗺️', chain: ['LEG', 'STOP', 'LEG', 'STOP', 'LEG', 'STOP', 'LEG'], helper: '3 stops with meals and activity ideas pre-filled.' },
```

**Step 3: Verify TypeScript errors reduced**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: fewer errors — LEG is now in SEG_STYLE so the visual config is complete. Remaining errors should be in `SegmentCard` (dropdown missing LEG) and `SegmentDetailsForm` (no LEG case) and `segment-templates.ts` (LEG not valid type for `buildTransferSegment`).

**Step 4: Commit**

```bash
cd ..
git add frontend/components/journey-segments/SegmentWizard.tsx
git commit -m "feat: add LEG visual config and update road trip template chains"
```

---

### Task 3: Add LEG to SegmentCard dropdown and transport card condition

**Files:**
- Modify: `frontend/components/journey-segments/SegmentCard.tsx`

**Step 1: Add LEG to the segment type dropdown options**

Find the `segmentTypeOptions` array near the top of the file:

```ts
const segmentTypeOptions: Array<{ value: SegmentType; label: string }> = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'BUS', label: 'Bus' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'LAYOVER', label: 'Layover' },
  { value: 'STOP', label: 'Stop' },
];
```

Change to:

```ts
const segmentTypeOptions: Array<{ value: SegmentType; label: string }> = [
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'LEG', label: 'Leg' },
  { value: 'BUS', label: 'Bus' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'LAYOVER', label: 'Layover' },
  { value: 'STOP', label: 'Stop' },
];
```

**Step 2: Extend isTransportSegment to include LEG**

Find the `isTransportSegment` const:

```ts
const isTransportSegment =
  segment.segment_type === 'TRANSFER' ||
  segment.segment_type === 'BUS' ||
  segment.segment_type === 'RAIL';
```

Change to:

```ts
const isTransportSegment =
  segment.segment_type === 'TRANSFER' ||
  segment.segment_type === 'LEG' ||
  segment.segment_type === 'BUS' ||
  segment.segment_type === 'RAIL';
```

**Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors should now only be in `SegmentDetailsForm.tsx` and `segment-templates.ts`.

**Step 4: Commit**

```bash
cd ..
git add frontend/components/journey-segments/SegmentCard.tsx
git commit -m "feat: add LEG to SegmentCard type dropdown and transport card condition"
```

---

### Task 4: Add LEG-specific form fields to SegmentDetailsForm

**Files:**
- Modify: `frontend/components/journey-segments/SegmentDetailsForm.tsx`

**Step 1: Add the leg mode options array**

At the top of `SegmentDetailsForm.tsx`, after the existing `transferModeOptions` array, add:

```ts
const legModeOptions: Array<{ value: string; label: string }> = [
  { value: 'drive', label: 'Drive (own car)' },
  { value: 'rental', label: 'Rental car' },
  { value: 'hire', label: 'Hired / chartered' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'other', label: 'Other' },
];
```

**Step 2: Add the LEG section to the form**

In the return statement of `SegmentDetailsForm`, after the TRANSFER-specific block (around line 163) and before the FLIGHT block (around line 165), add:

```tsx
{/* LEG-specific fields */}
{segment.segment_type === 'LEG' && (
  <>
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">Mode</label>
      <select
        value={String(meta.mode ?? '')}
        onChange={(e) => updateMeta({ mode: e.target.value || undefined })}
        className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
      >
        <option value="">Select mode</option>
        {legModeOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
    <Input
      label="Estimated distance"
      type="number"
      min="0"
      placeholder="e.g., 250"
      value={String(meta.distance ?? '')}
      onChange={(e) => updateMeta({ distance: e.target.value })}
    />
    <div className="md:col-span-2 flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">Route notes</label>
      <textarea
        value={String(meta.routeNotes ?? '')}
        onChange={(e) => updateMeta({ routeNotes: e.target.value })}
        placeholder="e.g., Take the coastal road, stop at the viewpoint"
        rows={2}
        className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs resize-none"
      />
    </div>
  </>
)}
```

**Step 3: Verify SegmentDetailsForm compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep SegmentDetailsForm
```

Expected: no errors for this file.

**Step 4: Commit**

```bash
cd ..
git add frontend/components/journey-segments/SegmentDetailsForm.tsx
git commit -m "feat: add LEG form fields (mode, distance, route notes)"
```

---

### Task 5: Update segment-templates.ts to use LEG for road trip legs

**Files:**
- Modify: `frontend/lib/segment-templates.ts`

**Step 1: Extend buildTransferSegment type constraint**

Find the `buildTransferSegment` function (around line 68):

```ts
const buildTransferSegment = (
  order: number,
  type: Extract<SegmentType, 'TRANSFER' | 'BUS' | 'RAIL'>,
  ...
```

Change the `type` constraint to include `'LEG'`:

```ts
const buildTransferSegment = (
  order: number,
  type: Extract<SegmentType, 'TRANSFER' | 'LEG' | 'BUS' | 'RAIL'>,
  ...
```

**Step 2: Update MULTI_STOP template**

Find the `case 'MULTI_STOP':` block (around line 101). Change both TRANSFER calls to LEG:

```ts
case 'MULTI_STOP':
  return [
    buildSegment(0, 'LEG', 'Start', 'Stop 1', options),
    buildSegment(1, 'STOP', 'Stop 1', 'Stop 1', options),
    buildSegment(2, 'LEG', 'Stop 1', 'Final', options),
  ];
```

**Step 3: Update ROAD_TRIP template**

Find the `case 'ROAD_TRIP':` block (around line 113). Change all three `buildTransferSegment` calls from `'TRANSFER'` to `'LEG'`:

```ts
case 'ROAD_TRIP':
  return [
    buildTransferSegment(
      0, 'LEG', 'Start', 'Stop 1',
      [ ... same options as before ... ],
      options
    ),
    buildStopSegment( ... ),
    buildTransferSegment(
      2, 'LEG', 'Stop 1', 'Stop 2',
      [ ... same options as before ... ],
      options
    ),
    buildStopSegment( ... ),
    buildTransferSegment(
      4, 'LEG', 'Stop 2', 'End',
      [ ... same options as before ... ],
      options
    ),
  ];
```

**Step 4: Update ROAD_TRIP_WITH_STOPS template**

Find the `case 'ROAD_TRIP_WITH_STOPS':` block (around line 163). Change all four `buildTransferSegment` calls from `'TRANSFER'` to `'LEG'`:

```ts
case 'ROAD_TRIP_WITH_STOPS':
  return [
    buildTransferSegment(0, 'LEG', 'Home', 'Stop 1', [...], options),
    buildStopSegment(...),
    buildTransferSegment(2, 'LEG', 'Stop 1', 'Stop 2', [...], options),
    buildStopSegment(...),
    buildTransferSegment(4, 'LEG', 'Stop 2', 'Stop 3', [...], options),
    buildStopSegment(...),
    buildTransferSegment(6, 'LEG', 'Stop 3', 'Home', [...], options),
  ];
```

**Step 5: Full TypeScript check — expect zero errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: **zero errors**. This confirms the change is complete and type-safe.

**Step 6: Lint check — expect zero new warnings**

```bash
cd frontend && npm run lint
```

Expected: clean output.

**Step 7: Commit**

```bash
cd ..
git add frontend/lib/segment-templates.ts
git commit -m "feat: use LEG segment type for road trip templates (ROAD_TRIP, ROAD_TRIP_WITH_STOPS, MULTI_STOP)"
```

---

### Task 6: Manual verification

**Step 1: Start the frontend**

```bash
cd frontend && npm run dev
```

**Step 2: Log in and open any trip**

Navigate to a trip → click "Add Journey" → the Segment Wizard opens on the template picker.

**Step 3: Test ROAD_TRIP template**

Select "Road trip" → click "Use template".

Expected:
- Segment tabs show 🛣️ icons for the connecting legs (not 🚗)
- Segment 1 of 5: LEG — shows teal left-border accent
- Form shows: Mode dropdown (drive/rental/hire/train/bus/ferry/other), Estimated distance, Route notes
- No "Airport parking" checkbox visible
- No "Pickup notes" / "Drop-off notes" fields visible
- Transport option cards still appear (Drive self, Uber, Taxi pre-populated)

**Step 4: Test AIR_TRAVEL template**

Select "Air travel" → "Use template".

Expected:
- TRANSFER segments (segments 1 and 3) still show 🚗 amber styling
- TRANSFER form still shows: Transfer mode, Provider, Pickup notes, Drop-off notes, Airport parking (when mode=car)
- No regression in airport transfer behaviour

**Step 5: Test type dropdown in SegmentCard**

In any journey form → add a blank segment → click the Type dropdown.

Expected: "Leg" option appears in the dropdown between Transfer and Bus.

**Step 6: Test saving a LEG segment**

Create a road trip journey, fill in origin/destination for a LEG segment, save. Then reopen the journey to edit.

Expected: The LEG segment loads with `segment_type === 'LEG'` and renders correctly (teal icon, correct form fields).

**Step 7: Final commit if any tweaks needed**

```bash
git add -p  # stage only changed files
git commit -m "fix: <description of any tweaks>"
```

---

## Done

After all 6 tasks:
- `npx tsc --noEmit` passes
- `npm run lint` passes
- Manual UI verification passes
- Road trip templates use LEG (🛣️ teal) for driving legs
- Air travel templates still use TRANSFER (🚗 amber) unchanged
- Existing saved journeys with TRANSFER are unaffected
