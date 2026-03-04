# Mapbox Search/Autofill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain text location inputs in the activity and destination forms with a Mapbox Search autocomplete dropdown that captures coordinates on selection.

**Architecture:** A new reusable `LocationSearchBox` component wraps `@mapbox/search-js-react`'s `SearchBox`. It's dropped into `ActivityForm` (location field) and `DestinationForm` (city/place field). On selection, coordinates flow into form state before save — the backend geocoding skips when `latitude` is already set. Free-text entries fall back to backend geocoding as before.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@mapbox/search-js-react`, react-hook-form (activities), controlled state (destinations), `NEXT_PUBLIC_MAPBOX_TOKEN`.

---

### Task 1: Install package and add env variable

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `.env.example`

**Step 1: Install the Mapbox Search JS React package**

```bash
cd frontend
npm install @mapbox/search-js-react
```

Expected: package added to `package.json` and `package-lock.json`.

**Step 2: Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.example`**

Find the existing `NEXT_PUBLIC_` section (or add after other env vars). Add:

```
# Mapbox public token — used for location autocomplete in activity/destination forms
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token-here
```

**Step 3: Add the token to your local `.env`**

Open `.env` in the project root and add:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-actual-token-here
```

**Step 4: Commit**

```bash
cd frontend && npm install  # ensure lock file is up to date
git add frontend/package.json frontend/package-lock.json .env.example
git commit -m "feat: install @mapbox/search-js-react and add NEXT_PUBLIC_MAPBOX_TOKEN"
```

---

### Task 2: Create `LocationSearchBox` component

**Files:**
- Create: `frontend/components/shared/LocationSearchBox.tsx`

No automated tests for this component — it wraps a third-party UI widget that requires a live browser. Manual verification is in Task 3 and 4.

**Step 1: Create the component**

Create `frontend/components/shared/LocationSearchBox.tsx`:

```tsx
'use client';

import { SearchBox } from '@mapbox/search-js-react';

export interface LocationSearchResult {
  text: string;
  lat: number;
  lng: number;
  country?: string;
}

interface LocationSearchBoxProps {
  value: string;
  placeholder?: string;
  onRetrieve: (result: LocationSearchResult) => void;
  onTextChange: (text: string) => void;
}

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function LocationSearchBox({
  value,
  placeholder = 'Search for a place',
  onRetrieve,
  onTextChange,
}: LocationSearchBoxProps) {
  return (
    <SearchBox
      accessToken={token}
      value={value}
      placeholder={placeholder}
      onChange={(newValue: string) => onTextChange(newValue)}
      onRetrieve={(res) => {
        const feature = res.features[0];
        if (!feature) return;

        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const text: string =
          feature.properties.name ??
          feature.properties.full_address ??
          value;
        const country: string | undefined =
          feature.properties.context?.country?.name;

        onRetrieve({ text, lat, lng, country });
      }}
      theme={{
        variables: {
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          boxShadow: 'none',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          padding: '0.625rem 0.75rem',
          colorBackground: '#f8fafc',
          colorText: '#0f172a',
        },
      }}
    />
  );
}
```

**Step 2: Run lint and type check**

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

Expected: no errors. If `@mapbox/search-js-react` types are missing, install them:
```bash
npm install --save-dev @types/mapbox__search-js-react 2>/dev/null || true
```
(The package ships its own types — this is a no-op if they're included.)

**Step 3: Commit**

```bash
git add frontend/components/shared/LocationSearchBox.tsx
git commit -m "feat: add LocationSearchBox component wrapping Mapbox SearchBox"
```

---

### Task 3: Integrate into ActivityForm

**Files:**
- Modify: `frontend/components/days/ActivityForm.tsx`

**Step 1: Understand the current location field**

Open `frontend/components/days/ActivityForm.tsx`. The location field is currently:

```tsx
<input id="activity-location" {...register('location')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Address or area" />
```

The form uses `useForm<Partial<DayActivity>>`. `DayActivity` already has `latitude` and `longitude` as optional fields.

**Step 2: Modify `ActivityForm.tsx`**

Replace the file's form hook and location input section. Key changes:
1. Add `setValue` from `useForm`
2. Add `watch` to read the current `location` value
3. Replace the location `<input>` with `<LocationSearchBox>`
4. Add `latitude` and `longitude` to `defaultValues`

Full updated `ActivityForm.tsx`:

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DayActivity } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { LocationSearchBox } from '@/components/shared/LocationSearchBox';

interface ActivityFormProps {
    activity?: Partial<DayActivity>;
    dayId: number;
    onSave: (data: Partial<DayActivity>) => Promise<void>;
    onClose: () => void;
    onDelete?: (id: number) => Promise<void>;
}

export const ActivityForm = ({ activity, dayId, onSave, onClose, onDelete }: ActivityFormProps) => {
    const { register, handleSubmit, setValue, watch } = useForm<Partial<DayActivity>>({
        defaultValues: {
            title: activity?.title || '',
            category: activity?.category || 'other',
            start_time: activity?.start_time || '10:00',
            end_time: activity?.end_time || '',
            location: activity?.location || '',
            notes: activity?.notes || '',
            cost: activity?.cost || undefined,
            booked: activity?.booked || false,
            latitude: activity?.latitude ?? undefined,
            longitude: activity?.longitude ?? undefined,
        }
    });

    const locationValue = watch('location') ?? '';
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: Partial<DayActivity>) => {
        setLoading(true);
        try {
            if (activity?.id) {
                await onSave({ ...data, id: activity.id, day_id: dayId });
            } else {
                await onSave({ ...data, day_id: dayId });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to save activity');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 sm:items-center sm:justify-center">
            <div className="w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] bg-white sm:rounded-2xl flex flex-col mt-auto shadow-2xl relative">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">{activity?.id ? 'Edit Activity' : 'Add Activity'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-5">
                    <div>
                        <label htmlFor="activity-title" className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                        <input id="activity-title" {...register('title', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Louvre Museum" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="activity-category" className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                            <select id="activity-category" {...register('category')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <option value="museum">Museum</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="bar">Bar</option>
                                <option value="activity">Activity</option>
                                <option value="transport">Transport</option>
                                <option value="accommodation">Accommodation</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="activity-cost" className="block text-sm font-semibold text-slate-700 mb-1">Cost (estimate)</label>
                            <input id="activity-cost" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="40.00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="activity-start-time" className="block text-sm font-semibold text-slate-700 mb-1">Start Time *</label>
                            <input id="activity-start-time" type="time" {...register('start_time', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label htmlFor="activity-end-time" className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
                            <input id="activity-end-time" type="time" {...register('end_time')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                        <LocationSearchBox
                            value={locationValue}
                            placeholder="Address or area"
                            onTextChange={(text) => setValue('location', text)}
                            onRetrieve={({ text, lat, lng }) => {
                                setValue('location', text);
                                setValue('latitude', lat);
                                setValue('longitude', lng);
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="activity-notes" className="block text-sm font-semibold text-slate-700 mb-1">Notes</label>
                        <textarea id="activity-notes" {...register('notes')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24" placeholder="Confirmation numbers, what to see..." />
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-100 rounded-xl">
                        <label htmlFor="activity-booked" className="text-sm font-semibold text-slate-700 cursor-pointer">Already booked / reserved?</label>
                        <input id="activity-booked" type="checkbox" {...register('booked')} className="w-5 h-5 text-sky-500 rounded border-slate-300" />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        {activity?.id && onDelete ? (
                            <button type="button" onClick={() => { if (activity.id) onDelete(activity.id); }} className="text-rose-500 hover:text-rose-600 text-sm font-semibold">Delete</button>
                        ) : <div />}
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Activity'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
```

**Step 3: Run lint and type check**

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Manual verification**

Start the dev server (`npm run dev`), open an activity form, type a location, confirm the dropdown appears, pick a suggestion, save. Open the activity again — the location text should be pre-filled. Check the map view: the pin should appear immediately without the geocoding delay.

**Step 5: Commit**

```bash
git add frontend/components/days/ActivityForm.tsx
git commit -m "feat: replace activity location input with Mapbox SearchBox"
```

---

### Task 4: Integrate into DestinationForm

**Files:**
- Modify: `frontend/components/destinations/DestinationForm.tsx`
- Modify: `frontend/components/destinations/useDestinationForm.ts`

**Step 1: Understand what changes**

Current flow in `useDestinationForm.ts`:
1. On submit, calls `geocodeAddress(address)` via Nominatim to validate location
2. Calls `destinationApi.create(formData)` — **without** lat/lng
3. After save, calls `destinationApi.update(destinationId, { lat, lng })` to persist coords

New flow:
1. When user picks from `LocationSearchBox`, store lat/lng + auto-fill `country` in `formData`
2. On submit, call `destinationApi.create(formData)` — **with** lat/lng already set
3. No Nominatim call, no second update call

`DestinationFormData` already has `latitude?: number` and `longitude?: number` — no type change needed.

**Step 2: Update `useDestinationForm.ts`**

Full updated file:

```ts
'use client';

import { useState } from 'react';
import { Destination, DestinationFormData } from '@/lib/types';
import { getLocalTimezone } from '@/lib/timezone-utils';
import { destinationApi } from '@/lib/api';
import { autoCreateDaysForDestination } from '@/lib/destination-day-utils';
import type { LocationSearchResult } from '@/components/shared/LocationSearchBox';

const createInitialFormData = (
  tripId: number,
  startDate?: string,
  endDate?: string,
  defaultTimezone?: string
): DestinationFormData => ({
  trip_id: tripId,
  name: '',
  country: '',
  region: '',
  timezone: defaultTimezone || getLocalTimezone(),
  arrival_date: startDate || '',
  departure_date: endDate || '',
  latitude: undefined,
  longitude: undefined,
});

export function useDestinationForm(
  tripId: number,
  onSuccess: () => void,
  startDate?: string,
  endDate?: string,
  defaultTimezone?: string
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DestinationFormData>(
    createInitialFormData(tripId, startDate, endDate, defaultTimezone)
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData(createInitialFormData(tripId, startDate, endDate, defaultTimezone));
  };

  const handleLocationRetrieve = (result: LocationSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      name: result.text,
      country: result.country ?? prev.country,
      latitude: result.lat,
      longitude: result.lng,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let savedDest: ReturnType<typeof destinationApi.update> | ReturnType<typeof destinationApi.create>;

      if (editingId) {
        savedDest = destinationApi.update(editingId, formData);
      } else {
        savedDest = destinationApi.create(formData);
      }

      const isNew = !editingId;
      const response = await savedDest;
      const destinationId = response.data?.id;

      if (isNew && destinationId && formData.arrival_date && formData.departure_date) {
        if (window.confirm(`Create itinerary days for ${formData.name} (${formData.arrival_date} – ${formData.departure_date})?`)) {
          try {
            await autoCreateDaysForDestination({
              tripId,
              destinationId,
              destinationName: formData.name,
              arrivalDate: formData.arrival_date,
              departureDate: formData.departure_date
            });
          } catch (err) {
            console.error("Failed to auto create days", err);
          }
        }
      }

      resetForm();
      onSuccess();

    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (dest: Destination) => {
    setEditingId(dest.id);
    setFormData({
      trip_id: tripId,
      name: dest.name,
      country: dest.country || '',
      region: dest.region || '',
      timezone: dest.timezone || defaultTimezone || getLocalTimezone(),
      arrival_date: dest.arrival_date || '',
      departure_date: dest.departure_date || '',
      latitude: dest.latitude,
      longitude: dest.longitude,
    });
  };

  const updateField = <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    editingId,
    isEditing: editingId !== null,
    isSubmitting,
    handleSubmit,
    handleLocationRetrieve,
    startEdit,
    resetForm,
    updateField,
  };
}
```

**Step 3: Update `DestinationForm.tsx`**

Replace the "City/Place" `<input>` with `<LocationSearchBox>`. Remove `locationWarning` prop (no longer returned from hook). Full updated file:

```tsx
'use client';

import { DestinationFormData } from '@/lib/types';
import { LocationSearchBox } from '@/components/shared/LocationSearchBox';
import type { LocationSearchResult } from '@/components/shared/LocationSearchBox';

interface DestinationFormProps {
  formData: DestinationFormData;
  isEditing: boolean;
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
  ) => void;
  onLocationRetrieve: (result: LocationSearchResult) => void;
}

export function DestinationForm({
  formData,
  isEditing,
  isSubmitting = false,
  onSubmit,
  onCancel,
  updateField,
  onLocationRetrieve,
}: DestinationFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-3">
        {isEditing ? 'Edit Destination' : 'Add Destination'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">City/Place</label>
          <LocationSearchBox
            value={formData.name}
            placeholder="e.g., Paris, Tokyo"
            onTextChange={(text) => updateField('name', text)}
            onRetrieve={onLocationRetrieve}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Country <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => updateField('country', e.target.value)}
            placeholder="e.g., France, Japan"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Region/State <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.region}
            onChange={(e) => updateField('region', e.target.value || '')}
            placeholder="e.g., Île-de-France, Kanto"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Timezone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={formData.timezone || ''}
            onChange={(e) => updateField('timezone', e.target.value)}
            placeholder="e.g., America/Denver"
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Arrival Date</label>
          <input
            type="date"
            value={formData.arrival_date}
            onChange={(e) => updateField('arrival_date', e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Departure Date</label>
          <input
            type="date"
            value={formData.departure_date}
            onChange={(e) => updateField('departure_date', e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving\u2026' : (isEditing ? 'Update Destination' : 'Add Destination')}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

**Step 4: Fix the call site that renders `DestinationForm`**

The component that renders `<DestinationForm>` now needs to pass `onLocationRetrieve` and no longer passes `locationWarning`. Search for usages:

```bash
cd frontend
grep -r "DestinationForm" --include="*.tsx" -l
```

Open each file found. Update:
- Remove `locationWarning={locationWarning}` prop
- Add `onLocationRetrieve={handleLocationRetrieve}` prop (the hook now returns `handleLocationRetrieve`)

**Step 5: Run lint and type check**

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Manual verification**

- Add a new destination → type "Tokyo" → pick "Tokyo, Japan" from dropdown → `name` fills as "Tokyo", `country` fills as "Japan" → save → check Network tab: single POST with lat/lng included, no follow-up PATCH
- Edit existing destination without changing name → save → existing coords preserved
- Type a city name without picking → save → backend geocodes silently

**Step 7: Commit**

```bash
git add frontend/components/destinations/DestinationForm.tsx \
        frontend/components/destinations/useDestinationForm.ts
git commit -m "feat: replace destination name input with Mapbox SearchBox"
```

---

### Task 5: Full lint, type check, and push

**Step 1: Run full frontend checks**

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

Expected: no errors.

**Step 2: Push**

```bash
git push
```

---

### Post-implementation: Add token to Vercel

In Vercel dashboard → project settings → Environment Variables, add:

```
NEXT_PUBLIC_MAPBOX_TOKEN = pk.your-token-here
```

Redeploy (or it will pick up on next push).
