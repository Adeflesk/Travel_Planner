# Timezone Auto-detect Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect trip timezone from the first destination using Mapbox geocoding + backend timezone lookup, replacing the manual IANA timezone picker.

**Architecture:** Reuse the existing `TransportLocationSearch` component (Mapbox Search API + `timezoneApi.lookup`) for the wizard's location fields. Add `formatTimezoneLabel()` to `timezone-utils.ts` for friendly display. Replace the default timezone `AutocompleteInput` with a read-only display + "Change" toggle.

**Tech Stack:** React, TypeScript, Mapbox Search API, existing `/timezone` backend endpoint

**Spec:** `docs/superpowers/specs/2026-03-12-timezone-auto-detect-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `frontend/components/transport/TransportLocationSearch.tsx` | Make `transportType` optional, add `label` prop |
| Modify | `frontend/lib/timezone-utils.ts` | Add `formatTimezoneLabel()` |
| Modify | `frontend/components/trips/TripWizard.tsx` | Swap location inputs, add timezone auto-detect + display |

---

## Chunk 1: Component Foundation

### Task 1: Make `TransportLocationSearch` reusable

**Files:**
- Modify: `frontend/components/transport/TransportLocationSearch.tsx:35-62`

- [ ] **Step 1: Make `transportType` optional and add `label` prop**

In `TransportLocationSearch.tsx`, update the `Props` interface and the `category` lookup:

```tsx
// Props interface (line 35-42) — change to:
interface Props {
  transportType?: string;   // was: transportType: string
  label?: string;           // NEW
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (raw: string) => void;
  onSelect: (loc: TransportLocation) => void;
}
```

Update the category lookup (line 62):

```tsx
// was: const category = CATEGORY[transportType] ?? null;
const category = transportType ? (CATEGORY[transportType] ?? null) : null;
```

- [ ] **Step 2: Add label rendering**

In the JSX `return` block, wrap the existing `<div ref={containerRef}>` content with a label element when `label` is provided. Add `label` to the destructured props.

Update the destructured props (line 48-55):

```tsx
export function TransportLocationSearch({
  transportType,
  label,        // NEW
  value,
  placeholder = 'Search…',
  required,
  onChange,
  onSelect,
}: Props) {
```

Update the return JSX — wrap in a container `div` with the label above:

```tsx
return (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
    )}
    <div ref={containerRef} className="relative">
      {/* ... existing input and dropdown unchanged ... */}
    </div>
  </div>
);
```

- [ ] **Step 3: Verify existing transport form still works**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors (existing callers in `TransportForm.tsx` pass `transportType`, so they're unaffected)

- [ ] **Step 4: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/components/transport/TransportLocationSearch.tsx
git commit -m "refactor: make TransportLocationSearch reusable with optional transportType and label"
```

---

### Task 2: Add `formatTimezoneLabel` to timezone-utils

**Files:**
- Modify: `frontend/lib/timezone-utils.ts`

- [ ] **Step 1: Add `formatTimezoneLabel` function**

Add this function after `getTimezoneAbbreviation` (after line 121):

```ts
/**
 * Format an IANA timezone string as a friendly label.
 * Example: formatTimezoneLabel('America/Los_Angeles') => "Pacific Standard Time (PST)"
 *
 * @param tz    IANA timezone string
 * @param atDate  Date to use for DST-accurate abbreviation (default: now)
 */
export function formatTimezoneLabel(tz: string, atDate?: Date): string {
  if (!isValidTimezone(tz)) return tz;
  try {
    const date = atDate ?? new Date();

    // Long name: "Pacific Standard Time"
    const longFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    });
    const longParts = longFormatter.formatToParts(date);
    const longName = longParts.find(p => p.type === 'timeZoneName')?.value || tz;

    // Short abbreviation: "PST"
    const shortFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const shortParts = shortFormatter.formatToParts(date);
    const shortName = shortParts.find(p => p.type === 'timeZoneName')?.value || '';

    if (shortName && shortName !== longName) {
      return `${longName} (${shortName})`;
    }
    return longName;
  } catch {
    return tz;
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/timezone-utils.ts
git commit -m "feat: add formatTimezoneLabel for friendly timezone display"
```

---

## Chunk 2: Wizard Integration

### Task 3: Rewire TripWizard to use Mapbox location search + auto-detect timezone

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`

This is the main task. We'll update imports, remove Nominatim logic, swap location inputs, and add the timezone auto-detect display.

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { getLocalTimezone, getSupportedTimezones } from '@/lib/timezone-utils';
import { geocodeAddress, Coordinates } from '@/lib/geocode-utils';
```

With:
```tsx
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { getLocalTimezone, getSupportedTimezones, formatTimezoneLabel } from '@/lib/timezone-utils';
import { TransportLocationSearch } from '@/components/transport/TransportLocationSearch';
import type { TransportLocation } from '@/components/transport/TransportLocationSearch';
```

Note: `Coordinates` type is still used in `TripWizardProps.onSubmit` and `validatedCoords`. Keep its definition inline or import from geocode-utils. Since `TransportLocation` provides `lat`/`lng` directly, update `validatedCoords` to use `{ lat: number; lng: number }` instead.

Update the `Coordinates` references. Change the import to just keep the type:
```tsx
import type { Coordinates } from '@/lib/geocode-utils';
```

- [ ] **Step 2: Add `showTimezoneOverride` state and remove Nominatim validation state**

Remove these lines:
```tsx
const [isValidating, setIsValidating] = useState(false);
const [locationWarnings, setLocationWarnings] = useState<{ home_base?: string; first_destination?: string }>({});
const lastValidated = useRef<{ home_base: string; first_destination: string } | null>(null);
```

Add:
```tsx
const [showTimezoneOverride, setShowTimezoneOverride] = useState(false);
```

- [ ] **Step 3: Simplify `handleNext`**

Replace the entire `handleNext` function with:

```tsx
const handleNext = () => {
    setStep(step + 1);
};
```

The Nominatim geocoding/validation logic is no longer needed — Mapbox handles validation via real-time suggestions, and coordinates are captured in `onSelect`.

- [ ] **Step 4: Replace Step 1 location inputs with `TransportLocationSearch`**

Replace the entire Step 1 section (lines 179-250) with:

```tsx
{step === 1 && (
    <div className="space-y-6 animate-fade-in-up">
        <Input
            label="Trip name"
            required
            value={data.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g., European Summer 2026"
        />
        <div className="grid grid-cols-2 gap-4">
            <Input
                type="date"
                label="Start date"
                required
                value={data.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
                error={error ? ' ' : undefined}
            />
            <Input
                type="date"
                label="End date"
                required
                value={data.end_date}
                onChange={(e) => set({ end_date: e.target.value })}
                error={error || undefined}
            />
        </div>
        <TransportLocationSearch
            label="Departing from"
            value={data.home_base}
            placeholder="e.g., Sydney, Australia"
            onChange={(val) => set({ home_base: val })}
            onSelect={(loc: TransportLocation) => {
                set({ home_base: loc.name });
                validatedCoords.current.home_base = { lat: loc.lat, lng: loc.lng };
            }}
        />
        <TransportLocationSearch
            label="First destination (optional)"
            value={data.first_destination}
            placeholder="e.g., Paris, France"
            onChange={(val) => set({ first_destination: val })}
            onSelect={(loc: TransportLocation) => {
                set({ first_destination: loc.name });
                validatedCoords.current.first_destination = { lat: loc.lat, lng: loc.lng };
                if (loc.timezone) {
                    set({ timezone: loc.timezone });
                    setShowTimezoneOverride(false);
                }
            }}
        />
        {/* Timezone display */}
        {data.timezone && !showTimezoneOverride && (
            <div className="flex items-center gap-2 text-sm text-slate-600 -mt-2">
                <span>Timezone:</span>
                <span className="font-medium text-slate-800">
                    {formatTimezoneLabel(data.timezone, data.start_date ? new Date(data.start_date) : undefined)}
                </span>
                <span className="text-slate-300">·</span>
                <button
                    type="button"
                    onClick={() => setShowTimezoneOverride(true)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                >
                    Change
                </button>
            </div>
        )}
        {showTimezoneOverride && (
            <AutocompleteInput
                label="Trip Timezone"
                value={data.timezone}
                onSelect={(v) => {
                    set({ timezone: v });
                    setShowTimezoneOverride(false);
                }}
                onChange={(e) => set({ timezone: e.target.value })}
                suggestions={timezones}
                placeholder="Search timezones..."
                hint="Important for keeping your itinerary times accurate."
            />
        )}
        <Textarea
            label="Description (optional)"
            value={data.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="What's this trip about?"
            rows={2}
        />
    </div>
)}
```

- [ ] **Step 5: Update the Next button (remove isValidating)**

In the navigation section, change:
```tsx
disabled={!canNext() || isValidating}
```
to:
```tsx
disabled={!canNext()}
```

And change:
```tsx
{isValidating ? 'Checking…' : 'Next Step →'}
```
to:
```tsx
Next Step →
```

- [ ] **Step 6: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "feat: auto-detect timezone from first destination in trip wizard"
```

---

## Chunk 3: Verification

### Task 4: Manual verification

- [ ] **Step 1: Start backend**

Run: `source .venv/bin/activate && uvicorn app.main:app --reload`

- [ ] **Step 2: Start frontend**

Run: `cd frontend && npm run dev`

- [ ] **Step 3: Test the wizard flow**

Open `http://localhost:3000`, create a new trip:
1. Type "Seattle" in the "First destination" field — Mapbox suggestions should appear
2. Select a suggestion — timezone should auto-fill and display as "Pacific Standard Time (PST)" (or PDT depending on date)
3. Click "Change" — the full IANA timezone autocomplete should appear
4. Select a timezone manually, then change destination — timezone should update to new destination's timezone
5. Leave first destination empty — timezone should remain as browser default
6. Verify "Departing from" also shows Mapbox suggestions

- [ ] **Step 4: Verify transport form still works**

Navigate to an existing trip → Transport → Add transport. Verify:
1. Location search still filters by transport type (airports for flights, etc.)
2. Timezone auto-detection still works on transport locations
3. No visual regressions in the transport form

- [ ] **Step 5: Final lint + type check**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: PASS
