# RoadTripBuilder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a two-column, timeline-first RoadTripBuilder component that replaces SegmentWizard's Step 2 for ROAD_TRIP and ROAD_TRIP_WITH_STOPS journeys, showing purpose-built LEG and STOP forms instead of the generic airport-transfer form.

**Architecture:** Intent state moves from SegmentWizard local state into `useSegmentWizard` hook so SegmentWizard can branch its Step 2 rendering based on `isRoadTrip`. RoadTripBuilder is a new standalone component that reuses `useSegmentBuilder`, `SegmentLocationInputs`, `SegmentTimingEditor`, `TransportOptionCards`, and `StopActivitiesList` — no logic changes to existing hooks. JourneyForm.tsx is untouched.

**Tech Stack:** TypeScript, React 18, Next.js 14 App Router, Tailwind CSS

**Design doc:** `docs/plans/2026-02-22-road-trip-builder-design.md`

**Prior commits on this branch:**
- `7e086970` — LEG added to SegmentType union
- `c4cff27c` — LEG visual config in SegmentWizard, road trip chains updated to LEG

---

## Before You Start

```bash
cd /path/to/Travel_Planner/frontend
npm run lint && npx tsc --noEmit
```

Both should pass clean. If they don't, stop and fix before proceeding.

---

### Task 1: Move intent into useSegmentWizard hook

**Files:**
- Modify: `frontend/components/journey-segments/useSegmentWizard.ts`

This hook currently only tracks `step` and `currentSegmentIndex`. We add `intent` so SegmentWizard can know which template was picked — and derive `isRoadTrip` — without local state.

**Step 1: Replace the file contents**

Replace the entire contents of `frontend/components/journey-segments/useSegmentWizard.ts` with:

```ts
import { useState } from 'react';
import type { JourneySegmentIntent } from '@/lib/types';

export type WizardStep = 'template' | 'segments' | 'review';

export const ROAD_TRIP_INTENTS: JourneySegmentIntent[] = ['ROAD_TRIP', 'ROAD_TRIP_WITH_STOPS'];

interface UseSegmentWizardReturn {
  step: WizardStep;
  intent: JourneySegmentIntent | null;
  setIntent: (intent: JourneySegmentIntent | null) => void;
  isRoadTrip: boolean;
  currentSegmentIndex: number;
  goToStep: (step: WizardStep) => void;
  goToSegment: (index: number) => void;
  nextSegment: () => void;
  prevSegment: () => void;
  isFirstSegment: boolean;
  isLastSegment: boolean;
}

export const useSegmentWizard = (segmentCount: number): UseSegmentWizardReturn => {
  const [step, setStep] = useState<WizardStep>('template');
  const [intent, setIntent] = useState<JourneySegmentIntent | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const goToStep = (newStep: WizardStep) => {
    setStep(newStep);
    if (newStep === 'segments') setCurrentSegmentIndex(0);
  };

  const goToSegment = (index: number) => {
    setCurrentSegmentIndex(index);
    setStep('segments');
  };

  const nextSegment = () => {
    if (currentSegmentIndex < segmentCount - 1) {
      setCurrentSegmentIndex((i) => i + 1);
    } else {
      setStep('review');
    }
  };

  const prevSegment = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex((i) => i - 1);
    } else {
      setStep('template');
    }
  };

  return {
    step,
    intent,
    setIntent,
    isRoadTrip: intent !== null && ROAD_TRIP_INTENTS.includes(intent),
    currentSegmentIndex,
    goToStep,
    goToSegment,
    nextSegment,
    prevSegment,
    isFirstSegment: currentSegmentIndex === 0,
    isLastSegment: currentSegmentIndex >= segmentCount - 1,
  };
};
```

**Step 2: Verify TypeScript picks up the new exports**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep useSegmentWizard
```

Expected: one or two errors about `intent`/`setIntent`/`isRoadTrip` not yet destructured in `SegmentWizard.tsx`. That's expected — fixed in Task 2.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/useSegmentWizard.ts
git commit -m "feat: move intent state into useSegmentWizard hook"
```

---

### Task 2: Update SegmentWizard to use hook intent and branch Step 2

**Files:**
- Modify: `frontend/components/journey-segments/SegmentWizard.tsx`

**Step 1: Read the file to confirm line numbers**

Read `frontend/components/journey-segments/SegmentWizard.tsx` lines 149–175 to see the current state declarations and handler functions.

**Step 2: Remove local selectedIntent state and use hook**

Find these lines (around 156–170):

```ts
const [selectedIntent, setSelectedIntent] = useState<JourneySegmentIntent | null>(null);

const { step, currentSegmentIndex, goToStep, goToSegment, nextSegment, prevSegment, isFirstSegment, isLastSegment } =
  useSegmentWizard(segments.length);

const { applyIntent, addSegment, removeSegment, addLayoverAfterFirstFlight, updateSegmentType, updateLocation, updateField } =
  useSegmentBuilder(segments, onChange, { timezone: defaultTimezone, startDate: startDate ?? new Date(), destinations });

const handleUseTemplate = (intent: JourneySegmentIntent) => { applyIntent(intent); goToStep('segments'); };
const handleStartBlank  = () => { applyIntent('SIMPLE'); goToStep('segments'); };

...
const showAddLayover = selectedIntent === 'AIR_TRAVEL' || selectedIntent === 'AIR_LAYOVER';
```

Replace with:

```ts
const { step, intent, setIntent, isRoadTrip, currentSegmentIndex, goToStep, goToSegment, nextSegment, prevSegment, isFirstSegment, isLastSegment } =
  useSegmentWizard(segments.length);

const { applyIntent, addSegment, removeSegment, addLayoverAfterFirstFlight, updateSegmentType, updateLocation, updateField } =
  useSegmentBuilder(segments, onChange, { timezone: defaultTimezone, startDate: startDate ?? new Date(), destinations });

const handleUseTemplate = (chosen: JourneySegmentIntent) => { setIntent(chosen); applyIntent(chosen); goToStep('segments'); };
const handleStartBlank  = () => { setIntent('SIMPLE'); applyIntent('SIMPLE'); goToStep('segments'); };

...
const showAddLayover = intent === 'AIR_TRAVEL' || intent === 'AIR_LAYOVER';
```

**Step 3: Update template picker to use hook intent**

In the Step 1 (template picker) JSX, find all `selectedIntent` references and change them to `intent`, and `setSelectedIntent` to `setIntent`. There are three occurrences:

```tsx
// BEFORE:
const isSelected = selectedIntent === opt.value;
// AFTER:
const isSelected = intent === opt.value;

// BEFORE:
onClick={() => setSelectedIntent(opt.value)}
// AFTER:
onClick={() => setIntent(opt.value)}

// BEFORE:
onClick={() => selectedIntent && handleUseTemplate(selectedIntent)}
disabled={!selectedIntent}
// AFTER:
onClick={() => intent && handleUseTemplate(intent)}
disabled={!intent}
```

**Step 4: Remove the useState import for selectedIntent**

Remove the `useState` import line since it's no longer used for selectedIntent. Verify useState is not used elsewhere; if not, remove it from the import. If it IS still used elsewhere, leave the import.

```ts
// BEFORE (top of file):
import { useState } from 'react';
// AFTER: remove if useState is no longer used
```

**Step 5: Add RoadTripBuilder branch in Step 2**

Find the step === 'segments' block (around line 244). At the very start of this block's return, add a road trip branch:

```tsx
// ── Step 2: Segment editor ──────────────────────────────────────────────────
if (step === 'segments') {
  // Road trip journeys get the dedicated two-column builder
  if (isRoadTrip) {
    return (
      <RoadTripBuilder
        segments={segments}
        onChange={onChange}
        defaultTimezone={defaultTimezone}
        destinations={destinations}
        startDate={startDate}
        onBack={() => goToStep('template')}
      />
    );
  }

  // All other intents use the step-by-step editor (existing code follows)
  return (
    <div className={containerClass}>
      ...
```

**Step 6: Add RoadTripBuilder import**

At the top of the file, add:

```ts
import { RoadTripBuilder } from './RoadTripBuilder';
```

**Step 7: Check tsc — expect one error about RoadTripBuilder not existing yet**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "RoadTripBuilder|SegmentWizard"
```

Expected: error about `RoadTripBuilder` module not found. That's correct — it's created in Task 6.

**Step 8: Commit (with --no-verify is NOT acceptable — fix lint issues if any)**

```bash
git add frontend/components/journey-segments/SegmentWizard.tsx
git commit -m "feat: use hook intent in SegmentWizard, branch Step 2 to RoadTripBuilder"
```

---

### Task 3: Create LegForm

**Files:**
- Create: `frontend/components/journey-segments/LegForm.tsx`

This is the right-panel form shown when a LEG segment is selected in RoadTripBuilder. It shows mode, distance, route notes, transport option cards, and cost — no airport-specific fields.

**Step 1: Create the file**

Create `frontend/components/journey-segments/LegForm.tsx` with:

```tsx
'use client';
import { JourneySegmentDraft, Destination } from '@/lib/types';
import type { DraftSegmentOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentLocationInputs } from './SegmentLocationInputs';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { TransportOptionCards } from './TransportOptionCards';

const legModeOptions = [
  { value: 'drive', label: 'Drive (own car)' },
  { value: 'rental', label: 'Rental car' },
  { value: 'hire', label: 'Hired / chartered' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'other', label: 'Other' },
];

interface LegFormProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
  destinations?: Destination[];
}

export const LegForm = ({ segment, index, onUpdateField, onUpdateLocation, destinations }: LegFormProps) => {
  const meta = segment.metadata ?? {};
  const updateMeta = (updates: Record<string, unknown>) =>
    onUpdateField(index, 'metadata', { ...meta, ...updates });

  const transportOpts = (meta.draft_segment_options ?? []) as DraftSegmentOption[];

  return (
    <div className="flex flex-col gap-4">
      {/* Location */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentLocationInputs
          segment={segment}
          index={index}
          onUpdateLocation={onUpdateLocation}
          destinations={destinations}
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} index={index} onUpdateField={onUpdateField} />
      </div>

      {/* Mode + Distance */}
      <div className="grid grid-cols-2 gap-3">
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
          label="Distance (km)"
          type="number"
          min="0"
          placeholder="e.g., 250"
          value={String(meta.distance ?? '')}
          onChange={(e) => updateMeta({ distance: e.target.value || undefined })}
        />
      </div>

      {/* Route notes */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">Route notes</label>
        <textarea
          value={String(meta.routeNotes ?? '')}
          onChange={(e) => updateMeta({ routeNotes: e.target.value || undefined })}
          placeholder="e.g., Take the coastal road, stop at the viewpoint"
          rows={2}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs resize-none"
        />
      </div>

      {/* Transport options */}
      <TransportOptionCards
        opts={transportOpts}
        selectedIdx={transportOpts.length > 0 ? Number(meta.selected_segment_option ?? -1) : null}
        onChange={(next) => updateMeta({ draft_segment_options: next })}
        onSelect={(oi, opt) => updateMeta({ selected_segment_option: oi, provider: opt.provider ?? opt.name })}
      />

      {/* Cost */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cost</div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={String(meta.cost ?? '')}
            onChange={(e) => updateMeta({ cost: e.target.value || undefined })}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Currency</label>
            <select
              value={String(meta.currency ?? 'USD')}
              onChange={(e) => updateMeta({ currency: e.target.value })}
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
            >
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(meta.booked)}
                onChange={(e) => updateMeta({ booked: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Booked
            </label>
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(meta.paid)}
                onChange={(e) => updateMeta({ paid: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Paid
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Verify it compiles in isolation**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep LegForm
```

Expected: no errors for LegForm.tsx.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/LegForm.tsx
git commit -m "feat: add LegForm for road trip LEG segments"
```

---

### Task 4: Create StopForm

**Files:**
- Create: `frontend/components/journey-segments/StopForm.tsx`

The right-panel form when a STOP segment is selected. Shows the stop location name, timing, pass-through toggle, and stop activities.

**Step 1: Create the file**

Create `frontend/components/journey-segments/StopForm.tsx` with:

```tsx
'use client';
import { JourneySegmentDraft } from '@/lib/types';
import type { DraftStopOption } from '@/lib/segment-templates';
import Input from '@/components/ui/Input';
import { SegmentTimingEditor } from './SegmentTimingEditor';
import { StopActivitiesList } from './StopActivitiesList';

interface StopFormProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const StopForm = ({ segment, index, onUpdateField, onUpdateLocation }: StopFormProps) => {
  const meta = segment.metadata ?? {};
  const updateMeta = (updates: Record<string, unknown>) =>
    onUpdateField(index, 'metadata', { ...meta, ...updates });

  const stopOpts = (meta.draft_stop_options ?? []) as DraftStopOption[];
  const locationName = segment.origin.name ?? '';

  const handleLocationChange = (name: string) => {
    onUpdateLocation(index, 'origin', name);
    onUpdateLocation(index, 'destination', name);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stop location name */}
      <Input
        label="Stop name"
        placeholder="e.g., Grand Canyon"
        value={locationName}
        onChange={(e) => handleLocationChange(e.target.value)}
      />

      {/* Timing */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SegmentTimingEditor segment={segment} index={index} onUpdateField={onUpdateField} />
      </div>

      {/* Pass-through toggle */}
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(meta.passThrough)}
          onChange={(e) => updateMeta({ passThrough: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Pass-through stop (no activities planned)
      </label>

      {/* Stop activities */}
      {!meta.passThrough && (
        <StopActivitiesList
          opts={stopOpts}
          onChange={(next) => updateMeta({ draft_stop_options: next })}
        />
      )}
    </div>
  );
};
```

**Step 2: Verify**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep StopForm
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/StopForm.tsx
git commit -m "feat: add StopForm for road trip STOP segments"
```

---

### Task 5: Create RoadTripTimeline

**Files:**
- Create: `frontend/components/journey-segments/RoadTripTimeline.tsx`

The left column of RoadTripBuilder. Shows alternating LEG and STOP rows as a vertical spine. Clicking a row selects it and opens its form in the right panel.

**Step 1: Create the file**

Create `frontend/components/journey-segments/RoadTripTimeline.tsx` with:

```tsx
import { JourneySegmentDraft } from '@/lib/types';
import { SEG_STYLE } from './SegmentWizard';

interface RoadTripTimelineProps {
  segments: JourneySegmentDraft[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onAddStop: () => void;
}

export const RoadTripTimeline = ({ segments, selectedIdx, onSelect, onAddStop }: RoadTripTimelineProps) => (
  <div className="flex flex-col">
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
      Your route
    </div>

    <div className="relative flex flex-col gap-0">
      {segments.map((seg, idx) => {
        const s = SEG_STYLE[seg.segment_type] ?? SEG_STYLE.TRANSFER;
        const isSelected = idx === selectedIdx;
        const isStop = seg.segment_type === 'STOP';
        const label = seg.origin.name && seg.destination.name && seg.origin.name !== seg.destination.name
          ? `${seg.origin.name} → ${seg.destination.name}`
          : seg.origin.name || (isStop ? 'Stop' : 'Leg');

        return (
          <div key={idx} className="flex items-stretch gap-2">
            {/* Spine */}
            <div className="flex flex-col items-center w-6 shrink-0">
              <div className={`w-3 h-3 rounded-full ${s.dot} ring-2 ring-white shadow-sm mt-2 shrink-0`} />
              {idx < segments.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 my-0.5" />
              )}
            </div>

            {/* Row button */}
            <button
              type="button"
              onClick={() => onSelect(idx)}
              className={`
                flex-1 min-w-0 text-left px-2.5 py-2 rounded-lg text-sm transition-all mb-1
                ${isSelected
                  ? `${s.badge} shadow-sm font-semibold`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-normal'
                }
              `}
            >
              <span className="mr-1.5 text-xs leading-none">{s.icon}</span>
              <span className="truncate">{label}</span>
            </button>
          </div>
        );
      })}
    </div>

    <button
      type="button"
      onClick={onAddStop}
      className="mt-3 ml-8 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all text-left"
    >
      + Add stop
    </button>
  </div>
);
```

**Step 2: Verify**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep RoadTripTimeline
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/RoadTripTimeline.tsx
git commit -m "feat: add RoadTripTimeline left column component"
```

---

### Task 6: Create RoadTripBuilder

**Files:**
- Create: `frontend/components/journey-segments/RoadTripBuilder.tsx`

The main component. Two-column layout: RoadTripTimeline on the left, LegForm or StopForm on the right based on the selected segment.

**Step 1: Create the file**

Create `frontend/components/journey-segments/RoadTripBuilder.tsx` with:

```tsx
'use client';
import { useState } from 'react';
import { Destination, JourneySegmentDraft } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { useSegmentBuilder } from './useSegmentBuilder';
import { RoadTripTimeline } from './RoadTripTimeline';
import { LegForm } from './LegForm';
import { StopForm } from './StopForm';

interface RoadTripBuilderProps {
  segments: JourneySegmentDraft[];
  onChange: (segments: JourneySegmentDraft[]) => void;
  defaultTimezone?: string;
  destinations?: Destination[];
  startDate?: Date;
  onBack: () => void;
}

export const RoadTripBuilder = ({
  segments,
  onChange,
  defaultTimezone = getLocalTimezone(),
  destinations,
  startDate,
  onBack,
}: RoadTripBuilderProps) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { updateLocation, updateField } = useSegmentBuilder(segments, onChange, {
    timezone: defaultTimezone,
    startDate: startDate ?? new Date(),
    destinations,
  });

  const safeIdx = Math.min(selectedIdx, Math.max(0, segments.length - 1));
  const selectedSeg = segments[safeIdx];

  const handleUpdateLocation = (idx: number, side: 'origin' | 'destination', name: string, timezone?: string) =>
    updateLocation(idx, side, { type: 'custom', name }, timezone);

  const handleAddStop = () => {
    if (segments.length === 0) return;

    const lastSegIdx = segments.length - 1;
    const lastLeg = segments[lastSegIdx];
    const endDest = lastLeg?.destination.name ?? 'End';
    const stopNum = segments.filter((s) => s.segment_type === 'STOP').length + 1;
    const stopName = `Stop ${stopNum}`;

    const newStop: JourneySegmentDraft = {
      segment_type: 'STOP',
      origin: { type: 'custom', name: stopName },
      destination: { type: 'custom', name: stopName },
      origin_timezone: defaultTimezone,
      destination_timezone: defaultTimezone,
      order: segments.length,
      metadata: { draft_stop_options: [] },
    };

    const newLeg: JourneySegmentDraft = {
      segment_type: 'LEG',
      origin: { type: 'custom', name: stopName },
      destination: { type: 'custom', name: endDest },
      origin_timezone: defaultTimezone,
      destination_timezone: defaultTimezone,
      order: segments.length + 1,
      metadata: { draft_segment_options: [] },
    };

    // Redirect the previous last LEG's destination to the new stop
    const updated = segments.map((seg, i) =>
      i === lastSegIdx && seg.segment_type === 'LEG'
        ? { ...seg, destination: { type: 'custom' as const, name: stopName } }
        : seg
    );

    onChange([...updated, newStop, newLeg]);
    setSelectedIdx(segments.length); // select the new STOP
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Plan your route</p>
          <p className="text-xs text-slate-500 mt-0.5">Click any leg or stop to edit its details.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
        >
          ← Change template
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex min-h-[320px]">
        {/* Left: timeline */}
        <div className="w-48 shrink-0 border-r border-slate-100 p-4 bg-slate-50/50">
          <RoadTripTimeline
            segments={segments}
            selectedIdx={safeIdx}
            onSelect={setSelectedIdx}
            onAddStop={handleAddStop}
          />
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 min-w-0 p-5 overflow-y-auto">
          {segments.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No segments yet.</p>
          ) : selectedSeg?.segment_type === 'STOP' ? (
            <StopForm
              segment={selectedSeg}
              index={safeIdx}
              onUpdateField={updateField}
              onUpdateLocation={handleUpdateLocation}
            />
          ) : (
            <LegForm
              segment={selectedSeg}
              index={safeIdx}
              onUpdateField={updateField}
              onUpdateLocation={handleUpdateLocation}
              destinations={destinations}
            />
          )}
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Run full TypeScript check — expect zero errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: **zero errors**. All new components are now in place and SegmentWizard's import of RoadTripBuilder resolves.

If there are errors, fix them before committing. Common issues:
- `JourneySegmentDraft.order` might not exist in the type — if missing, remove the `order` field from `newStop`/`newLeg` in `handleAddStop`
- `type: 'custom'` on origin/destination — use `as const` if TypeScript complains

**Step 3: Run lint**

```bash
cd frontend && npm run lint
```

Expected: no new warnings in the four new files.

**Step 4: Commit**

```bash
git add frontend/components/journey-segments/RoadTripBuilder.tsx
git commit -m "feat: add RoadTripBuilder two-column timeline component"
```

---

### Task 7: Export RoadTripBuilder and full verification

**Files:**
- Modify: `frontend/components/journey-segments/index.ts`

**Step 1: Add export**

In `frontend/components/journey-segments/index.ts`, add:

```ts
export { RoadTripBuilder } from './RoadTripBuilder';
```

**Step 2: Final TypeScript + lint**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: zero errors, no new lint warnings.

**Step 3: Commit**

```bash
git add frontend/components/journey-segments/index.ts
git commit -m "feat: export RoadTripBuilder from journey-segments index"
```

**Step 4: Manual verification checklist**

Start the dev server:
```bash
cd frontend && npm run dev
```

Log in, open any trip, click "Add Journey".

| Test | Expected |
|---|---|
| Pick "Road trip" template | Step 2 shows two-column RoadTripBuilder (NOT step-by-step) |
| Left column | Shows 🛣️ Leg rows and 📍 Stop rows alternating |
| Click a LEG row | Right panel shows mode/distance/route notes/transport cards. No airport parking, no pickup/dropoff notes. |
| Click a STOP row | Right panel shows stop name input, timing, pass-through toggle, stop activities. |
| Click "+ Add stop" | New STOP + LEG rows appear in timeline. New STOP is auto-selected. Last LEG's destination updated. |
| Click "← Change template" | Returns to Step 1 template picker |
| Re-pick "Road trip" | RoadTripBuilder resets with fresh segments |
| Pick "Air travel" template | Step 2 shows the original step-by-step wizard — unchanged |
| Pick "Extended road trip" | Step 2 also shows RoadTripBuilder (isRoadTrip=true for ROAD_TRIP_WITH_STOPS) |
| Pick "Multi-stop" | Step 2 shows step-by-step wizard (MULTI_STOP is NOT a road trip) |
| Save a road trip journey | Journey saves and segments persist. Reopen: LEG segments render correctly in trip timeline. |

**Step 5: Run backend tests to confirm zero regressions**

```bash
cd /path/to/Travel_Planner
source .venv/bin/activate
pytest tests/ -x -q
```

Expected: all tests pass (no backend changes were made).

---

## Done

After all 7 tasks:
- `npx tsc --noEmit` passes with zero errors
- `npm run lint` passes with no new warnings
- Road trip journeys use the two-column RoadTripBuilder
- Air travel and multi-stop journeys use the unchanged step-by-step wizard
- LEG segments show mode/distance/route notes (no airport fields)
- STOP segments show stop name/activities
- "+ Add stop" inserts new STOP + LEG pair correctly
- All backend tests pass
