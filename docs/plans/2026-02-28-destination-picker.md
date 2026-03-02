# Destination Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a destination picker to the DayHeader so users can link a trip day to a destination with one click, and wire up transport coordinate geocoding + smart pre-fill.

**Architecture:** `DestinationPicker` is a self-contained client component placed in `DayHeader`, replacing the static location pill. It fetches the trip's destinations, manages its own popover state, PATCHes `destination_id` + `location` on selection, and supports inline destination creation. `TransportForm` gets coordinate pre-fill from linked day destinations.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Nominatim (geocoding), FastAPI backend already updated with coordinate columns.

---

## Task 0: Rate-limit Nominatim geocoding utility

**Files:**
- Modify: `frontend/lib/geocode-utils.ts`

**Why:** Nominatim enforces a strict 1 request/second policy. The wizard's `backgroundSetup` fires `geocodeAddress(first_destination)` and `geocodeAddress(home_base)` simultaneously, violating this limit.

**Step 1: Add a module-level sequential queue**

At the top of `geocode-utils.ts`, before the existing `geocodeAddress` function, add a queue variable. Then wrap the existing implementation in a queued pattern:

```typescript
// Rate-limit Nominatim: max 1 request per second (TOS requirement)
// All geocodeAddress calls are serialised through this promise chain.
let _geocodeQueue: Promise<unknown> = Promise.resolve();

export function geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address || !address.trim()) return Promise.resolve(null);

    // Chain onto the queue so requests run sequentially with a 1.1s gap
    const request = _geocodeQueue.then(() => _doGeocode(address));
    // Advance the queue tail regardless of success or failure
    _geocodeQueue = request.then(
        () => new Promise(r => setTimeout(r, 1100)),
        () => new Promise(r => setTimeout(r, 1100)),
    );
    return request;
}

async function _doGeocode(address: string): Promise<Coordinates | null> {
    // (move the existing geocodeAddress body here, unchanged)
}
```

Rename the existing `geocodeAddress` body to `_doGeocode` and replace the export with the queued wrapper above.

**Step 2: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/lib/geocode-utils.ts
git commit -m "fix: serialise Nominatim geocoding requests to respect 1 req/s rate limit"
```

---

## Task 1: Add coordinate fields to TripTransport frontend types

**Files:**
- Modify: `frontend/lib/types.ts:137-176`

**Step 1: Add fields to TripTransport and TripTransportCreate**

In `frontend/lib/types.ts`, update both interfaces:

```typescript
export interface TripTransport {
  // ... existing fields (id through extra, options) ...
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
}

export interface TripTransportCreate {
  // ... existing fields ...
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
}
```

Add the 4 fields to `TripTransport` after `sort_order` (before `extra`) and to `TripTransportCreate` after `sort_order` (before `extra`).

**Step 2: Verify types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/lib/types.ts
git commit -m "feat: add coordinate fields to TripTransport frontend types"
```

---

## Task 2: Create DestinationPicker component

**Files:**
- Create: `frontend/components/days/DestinationPicker.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, MapPinOff, ChevronDown, Check, Plus, X } from 'lucide-react';
import { TripDay, Destination } from '@/lib/types';
import { destinationApi, dayApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';

interface DestinationPickerProps {
    day: TripDay;
    tripId: number;
    onDestinationChanged: () => void;
}

export const DestinationPicker = ({ day, tripId, onDestinationChanged }: DestinationPickerProps) => {
    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCountry, setNewCountry] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Fetch destinations for this trip
    useEffect(() => {
        destinationApi.getByTripId(tripId)
            .then(res => setDestinations(res.data))
            .catch(console.error);
    }, [tripId]);

    // Close popover on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowCreateForm(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const currentDestination = destinations.find(d => d.id === day.destination_id);

    const linkDestination = async (dest: Destination) => {
        setIsSaving(true);
        try {
            await dayApi.updateDay(day.id, {
                destination_id: dest.id,
                location: dest.name,
            });
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to link destination', e);
        } finally {
            setIsSaving(false);
        }
    };

    const unlinkDestination = async () => {
        setIsSaving(true);
        try {
            await dayApi.updateDay(day.id, {
                destination_id: null,
                location: '',
            });
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to unlink destination', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        try {
            const res = await destinationApi.create({
                trip_id: tripId,
                name: newName.trim(),
                country: newCountry.trim() || undefined,
            });
            const dest = res.data;

            // Link day to new destination
            await dayApi.updateDay(day.id, {
                destination_id: dest.id,
                location: dest.name,
            });

            // Background geocode
            const address = [newName.trim(), newCountry.trim()].filter(Boolean).join(', ');
            geocodeAddress(address).then(coords => {
                if (coords) {
                    destinationApi.update(dest.id, {
                        latitude: coords.lat,
                        longitude: coords.lng,
                    }).catch(console.error);
                }
            });

            setNewName('');
            setNewCountry('');
            setShowCreateForm(false);
            setIsOpen(false);
            onDestinationChanged();
        } catch (e) {
            console.error('Failed to create destination', e);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            {/* Badge / trigger */}
            <button
                onClick={() => setIsOpen(v => !v)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors disabled:opacity-60"
            >
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentDestination
                    ? <span>{currentDestination.name}{currentDestination.country ? `, ${currentDestination.country}` : ''}</span>
                    : day.location
                        ? <>
                            <span className="text-slate-500">{day.location}</span>
                            <MapPinOff
                                className="w-3 h-3 text-slate-300"
                                title="Not linked to a destination — click to link for map features"
                            />
                          </>
                        : <span className="text-slate-400">No destination</span>
                }
                <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-30 overflow-hidden">
                    {/* Destination list */}
                    <div className="py-1 max-h-48 overflow-y-auto">
                        {destinations.length === 0 && (
                            <p className="px-4 py-3 text-sm text-slate-400">No destinations yet</p>
                        )}
                        {destinations.map(dest => (
                            <button
                                key={dest.id}
                                onClick={() => linkDestination(dest)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors"
                            >
                                <Check className={`w-4 h-4 shrink-0 ${dest.id === day.destination_id ? 'text-sky-600' : 'invisible'}`} />
                                <span className="font-medium text-slate-800">{dest.name}</span>
                                {dest.country && <span className="text-slate-400 text-xs ml-auto">{dest.country}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Unlink option */}
                    {day.destination_id && (
                        <div className="border-t border-slate-100">
                            <button
                                onClick={unlinkDestination}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Unlink destination
                            </button>
                        </div>
                    )}

                    {/* Create new */}
                    <div className="border-t border-slate-100">
                        {!showCreateForm ? (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-sky-600 hover:bg-sky-50 transition-colors font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                New destination…
                            </button>
                        ) : (
                            <div className="p-3 space-y-2">
                                <input
                                    autoFocus
                                    placeholder="City name *"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
                                />
                                <input
                                    placeholder="Country (optional)"
                                    value={newCountry}
                                    onChange={e => setNewCountry(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || isCreating}
                                        className="flex-1 py-1.5 text-sm font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isCreating ? 'Creating…' : 'Create'}
                                    </button>
                                    <button
                                        onClick={() => { setShowCreateForm(false); setNewName(''); setNewCountry(''); }}
                                        className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
```

**Step 2: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/components/days/DestinationPicker.tsx
git commit -m "feat: add DestinationPicker component for day-destination linking"
```

---

## Task 3: Wire DestinationPicker into DayHeader and DayBuilder

**Files:**
- Modify: `frontend/components/days/DayHeader.tsx`
- Modify: `frontend/components/days/DayBuilder.tsx`
- Modify: `frontend/components/days/index.ts`

**Step 1: Update DayHeader**

Replace the static location pill with `<DestinationPicker>`. Add two new required props: `tripId` and `onDestinationChanged`.

The full updated `DayHeader.tsx`:

```typescript
import { format } from 'date-fns';
import { Settings2, Plus, Plane } from 'lucide-react';
import { TripDay } from '@/lib/types';
import { parseSafeDate } from '@/lib/datetime-utils';
import { DestinationPicker } from './DestinationPicker';

interface DayHeaderProps {
    day: TripDay;
    tripId: number;
    onEditDay: () => void;
    onAddActivity: () => void;
    onAddTransport?: () => void;
    onDestinationChanged: () => void;
}

export const DayHeader = ({ day, tripId, onEditDay, onAddActivity, onAddTransport, onDestinationChanged }: DayHeaderProps) => {
    const parsedDate = parseSafeDate(day.date);
    const dayName = format(parsedDate, 'EEEE');
    const monthYear = format(parsedDate, 'MMMM yyyy');

    return (
        <div className="mb-8 mt-2">
            <div className="flex items-start justify-between gap-4">
                {/* Left: date badge + info */}
                <div className="flex items-start gap-4">
                    {/* Dark editorial date badge */}
                    <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-xl px-3 pt-3 pb-2 min-w-[52px] shrink-0">
                        <span
                            className="text-3xl font-bold leading-none"
                            style={{ fontFamily: 'var(--font-display)' }}
                        >
                            {format(parsedDate, 'd')}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1 leading-none">
                            {format(parsedDate, 'MMM')}
                        </span>
                    </div>

                    {/* Day info */}
                    <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                            <h1
                                className="text-2xl font-bold text-slate-900 leading-tight tracking-tight"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {dayName}
                            </h1>
                            <button
                                onClick={onEditDay}
                                className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit day details"
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </div>
                        {day.title && (
                            <h2
                                className="text-base font-semibold text-slate-600 mt-0.5 italic"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                {day.title}
                            </h2>
                        )}
                        <p className="text-sm text-slate-400 mt-0.5 font-medium">{monthYear}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <DestinationPicker
                                day={day}
                                tripId={tripId}
                                onDestinationChanged={onDestinationChanged}
                            />
                        </div>
                        {day.notes && (
                            <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                                {day.notes}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {onAddTransport && (
                        <button
                            onClick={onAddTransport}
                            className="inline-flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-medium rounded-xl px-4 py-2.5 transition-colors"
                        >
                            <Plane className="w-3.5 h-3.5" />
                            Transport
                        </button>
                    )}
                    <button
                        onClick={onAddActivity}
                        className="inline-flex items-center gap-1.5 text-sm bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-5 py-2.5 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Activity
                    </button>
                </div>
            </div>
            <div className="h-px bg-slate-100 mt-6" />
        </div>
    );
};
```

**Step 2: Update DayBuilder to pass new props to DayHeader**

In `DayBuilder.tsx`, find the `<DayHeader>` usage and add `tripId` and `onDestinationChanged={onRefresh}`:

```typescript
<DayHeader
    day={day}
    tripId={tripId}
    onEditDay={() => setShowEditDayModal(true)}
    onAddActivity={openCreateForm}
    onAddTransport={() => {
        setSelectedTransport(null);
        setIsTransportFormOpen(true);
    }}
    onDestinationChanged={onRefresh}
/>
```

**Step 3: Export DestinationPicker from the days index**

In `frontend/components/days/index.ts`, add:

```typescript
export * from './DestinationPicker';
```

**Step 4: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Manual smoke test**

- Open a day in the browser
- Confirm the location pill is now a clickable `DestinationPicker` badge
- Click it — popover should open with the trip's destinations listed
- Select a destination — day should reload showing the linked destination name
- Click unlink — destination should clear
- Click `+ New destination…` — inline form should expand; create one — it should be linked to the day

**Step 6: Commit**

```bash
git add frontend/components/days/DayHeader.tsx \
        frontend/components/days/DayBuilder.tsx \
        frontend/components/days/index.ts
git commit -m "feat: wire DestinationPicker into DayHeader and DayBuilder"
```

---

## Task 4: Auto-geocode transport origin/destination on create

**Files:**
- Modify: `frontend/components/transport/useTransport.ts`

**Step 1: Update createTransport to background-geocode**

Import `geocodeAddress` and `transportApi`, then update `createTransport`:

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { TripTransport, TripTransportCreate, TripTransportUpdate } from '@/lib/types';
import { transportApi } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode-utils';

export function useTransport(tripId: number, dayId: number) {
  const [items, setItems] = useState<TripTransport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await transportApi.getByDayId(tripId, dayId);
      setItems(res.data);
    } catch (err) {
      console.error('Error loading transport:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, dayId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTransport = async (data: TripTransportCreate) => {
    const res = await transportApi.create(tripId, data);
    await load();

    // Background geocoding — only geocode if coordinates not already provided
    const id = res.data.id;
    if (data.origin && data.origin_latitude == null) {
      geocodeAddress(data.origin).then(coords => {
        if (coords) {
          transportApi.update(id, { origin_latitude: coords.lat, origin_longitude: coords.lng })
            .catch(console.error);
        }
      });
    }
    if (data.destination && data.destination_latitude == null) {
      geocodeAddress(data.destination).then(coords => {
        if (coords) {
          transportApi.update(id, { destination_latitude: coords.lat, destination_longitude: coords.lng })
            .catch(console.error);
        }
      });
    }
  };

  const updateTransport = async (id: number, data: TripTransportUpdate) => {
    await transportApi.update(id, data);
    await load();
  };

  const deleteTransport = async (id: number) => {
    await transportApi.delete(id);
    await load();
  };

  return { items, loading, reload: load, createTransport, updateTransport, deleteTransport };
}
```

**Step 2: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/components/transport/useTransport.ts
git commit -m "feat: auto-geocode transport origin/destination coordinates on create"
```

---

## Task 5: Smart pre-fill transport form from linked day destination

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`
- Modify: `frontend/components/days/DayBuilder.tsx`

**Goal:** When the user selects a departure day that has a linked destination, auto-fill the `From` field with the destination name and store its coordinates so geocoding is skipped.

**Step 1: Load destinations in DayBuilder and pass to TransportForm**

In `DayBuilder.tsx`:

1. Add import: `import { destinationApi } from '@/lib/api';` and `import { Destination } from '@/lib/types';`
2. Add state: `const [destinations, setDestinations] = useState<Destination[]>([]);`
3. Load destinations alongside trip days (update the existing `useEffect`):

```typescript
useEffect(() => {
    Promise.all([
        tripApi.getDays(tripId),
        destinationApi.getByTripId(tripId),
    ]).then(([daysRes, destsRes]) => {
        setTripDays(daysRes.data);
        setDestinations(destsRes.data);
    }).catch(() => {});
}, [tripId]);
```

4. Pass `destinations` to `TransportForm`:

```typescript
<TransportForm
    tripDays={tripDays}
    destinations={destinations}
    defaultDayId={day.id}
    initialData={selectedTransport ?? undefined}
    onSave={handleSaveTransport}
    onDelete={selectedTransport ? handleDeleteTransport : undefined}
    onClose={() => {
        setIsTransportFormOpen(false);
        setSelectedTransport(null);
    }}
    isSubmitting={isTransportSubmitting}
/>
```

**Step 2: Update TransportForm to accept destinations and pre-fill origin**

Key changes to `TransportForm.tsx`:

1. Add `destinations?: Destination[]` to `TransportFormProps`
2. Add import: `import { Destination } from '@/lib/types';`
3. Add state for tracked coordinates:

```typescript
const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(
  initialData?.origin_latitude != null
    ? { lat: initialData.origin_latitude, lng: initialData.origin_longitude! }
    : null
);
const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(
  initialData?.destination_latitude != null
    ? { lat: initialData.destination_latitude, lng: initialData.destination_longitude! }
    : null
);
// Track the prefilled origin text so we know if user edited it
const [prefilledOrigin, setPrefilledOrigin] = useState<string | null>(null);
```

4. In the departure day `onChange` handler, add pre-fill logic:

```typescript
onChange={e => {
  const newDepId = e.target.value;
  setDepDayId(newDepId);
  if (overnight && newDepId) {
    advanceArrToNextDay(newDepId);
  }

  // Smart pre-fill origin from linked destination
  if (newDepId && destinations) {
    const depDay = tripDays.find(d => d.id === parseInt(newDepId, 10));
    if (depDay?.destination_id) {
      const dest = destinations.find(d => d.id === depDay.destination_id);
      if (dest) {
        const label = dest.name + (dest.country ? `, ${dest.country}` : '');
        setOrigin(label);
        setPrefilledOrigin(label);
        if (dest.latitude != null && dest.longitude != null) {
          setOriginCoords({ lat: dest.latitude, lng: dest.longitude });
        } else {
          setOriginCoords(null);
        }
      }
    }
  }
}}
```

5. On the origin `<input>`, clear coords if user edits away from the pre-filled value:

```typescript
onChange={e => {
  setOrigin(e.target.value);
  if (e.target.value !== prefilledOrigin) {
    setOriginCoords(null);
    setPrefilledOrigin(null);
  }
}}
```

6. Include coords in `handleSubmit` data:

```typescript
const data: TripTransportCreate = {
  transport_type: type,
  origin,
  destination,
  // ... rest of existing fields ...
  origin_latitude: originCoords?.lat,
  origin_longitude: originCoords?.lng,
  destination_latitude: destCoords?.lat,
  destination_longitude: destCoords?.lng,
  extra: Object.keys(extra).length ? extra : undefined,
};
```

7. Optionally add a hint below the origin input when pre-filled:

```typescript
{prefilledOrigin && origin === prefilledOrigin && (
  <p className="text-xs text-sky-600 mt-1">📍 Auto-filled from linked destination</p>
)}
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Manual smoke test**

- Open a day that has a destination linked
- Add transport — select that day as the departure day
- Confirm `From` field auto-fills with the destination name and hint appears
- Edit the origin text manually — hint should disappear
- Save — transport saves correctly

**Step 5: Commit**

```bash
git add frontend/components/transport/TransportForm.tsx \
        frontend/components/days/DayBuilder.tsx
git commit -m "feat: smart pre-fill transport origin from linked day destination"
```

---

## Final check

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Then run backend tests to confirm nothing broken:

```bash
source .venv/bin/activate && pytest -q tests/
```
