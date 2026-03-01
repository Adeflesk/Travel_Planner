# Location Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate location strings via Nominatim before saving at every place a destination is created, showing a soft inline warning if geocoding fails while always allowing the save to proceed.

**Architecture:** Each of the three creation points (TripWizard, DestinationPicker, DestinationForm) gains a `locationWarning` state and calls `geocodeAddress()` before committing the save. No new shared hook is needed — the logic is a single `geocodeAddress()` call at each site.

**Tech Stack:** Next.js 14, TypeScript, `geocodeAddress()` from `frontend/lib/geocode-utils.ts` (already imported in DestinationPicker and useDestinationForm).

---

## Task 1: TripWizard — validate `home_base` and `first_destination` on Next

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`

The wizard validates both optional location fields in parallel when the user clicks **Next Step →** on step 1. The button shows a loading state during validation. Warnings appear under each field and the step advances regardless.

**Step 1: Add state and imports**

At the top of the file add the import:

```typescript
import { geocodeAddress } from '@/lib/geocode-utils';
```

Inside the `TripWizard` component, add two new state variables after the existing `data` state:

```typescript
const [isValidating, setIsValidating] = useState(false);
const [locationWarnings, setLocationWarnings] = useState<{ home_base?: string; first_destination?: string }>({});
```

**Step 2: Replace the Next button's `onClick` with an async validation handler**

Currently the Next button calls `() => setStep(step + 1)` directly. Replace it with a call to a new `handleNext` function.

Add `handleNext` just before the `return` statement:

```typescript
const handleNext = async () => {
    if (step !== 1) {
        setStep(step + 1);
        return;
    }
    // Validate location fields on step 1 only
    const warnings: { home_base?: string; first_destination?: string } = {};
    const fieldsToCheck: Array<{ key: 'home_base' | 'first_destination'; value: string }> = [
        { key: 'home_base', value: data.home_base.trim() },
        { key: 'first_destination', value: data.first_destination.trim() },
    ];
    const nonEmpty = fieldsToCheck.filter(f => f.value !== '');
    if (nonEmpty.length > 0) {
        setIsValidating(true);
        const results = await Promise.all(
            nonEmpty.map(f => geocodeAddress(f.value).then(coords => ({ key: f.key, found: coords !== null })))
        );
        setIsValidating(false);
        results.forEach(r => {
            if (!r.found) warnings[r.key] = "We couldn't confirm this location — check the spelling if needed.";
        });
    }
    setLocationWarnings(warnings);
    setStep(step + 1);
};
```

**Step 3: Clear warnings when the user edits the location fields**

Find the `home_base` Input and add a wrapper to the `onChange`:

```typescript
onChange={(e) => {
    set({ home_base: e.target.value });
    if (locationWarnings.home_base) setLocationWarnings(w => ({ ...w, home_base: undefined }));
}}
```

Do the same for `first_destination`:

```typescript
onChange={(e) => {
    set({ first_destination: e.target.value });
    if (locationWarnings.first_destination) setLocationWarnings(w => ({ ...w, first_destination: undefined }));
}}
```

**Step 4: Render warnings beneath the fields**

The `home_base` Input renders at approximately line 168. After it, add:

```tsx
{locationWarnings.home_base && (
    <p className="text-xs text-amber-600 -mt-4">
        {locationWarnings.home_base}
    </p>
)}
```

After the `first_destination` Input (approximately line 176), add:

```tsx
{locationWarnings.first_destination && (
    <p className="text-xs text-amber-600 -mt-4">
        {locationWarnings.first_destination}
    </p>
)}
```

**Step 5: Update the Next button**

Replace the existing Next button's `onClick` and add a loading label:

```tsx
<Button
    disabled={!canNext() || isValidating}
    onClick={handleNext}
    className="min-w-[120px]"
    size="lg"
>
    {isValidating ? 'Checking…' : 'Next Step →'}
</Button>
```

**Step 6: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Manual smoke test**

- Open the "New Trip" wizard
- On step 1, enter a gibberish home base (e.g. "xyznotacity") and a valid first destination (e.g. "Paris, France")
- Click "Next Step →" — button should show "Checking…" briefly
- After ~1s, wizard should advance to step 2 with a warning under home base only
- Go back to step 1 — edit the home_base field — warning should disappear
- Try with both fields empty — Next should advance immediately without any network call

**Step 8: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx
git commit -m "feat: validate location fields in TripWizard before advancing"
```

---

## Task 2: DestinationPicker — validate before inline create

**Files:**
- Modify: `frontend/components/days/DestinationPicker.tsx`

The picker already has `isCreating` state and an `error` state. Add a `locationWarning` state that is shown inside the create form. The destination is still created even if geocoding fails.

**Step 1: Add `locationWarning` state**

Inside the `DestinationPicker` component, add after the existing state declarations:

```typescript
const [locationWarning, setLocationWarning] = useState<string | null>(null);
```

**Step 2: Geocode before creating in `handleCreate`**

Replace the existing `handleCreate` function:

```typescript
const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    setLocationWarning(null);

    // Validate location before saving
    const address = [newName.trim(), newCountry.trim()].filter(Boolean).join(', ');
    const coords = await geocodeAddress(address);
    if (!coords) {
        setLocationWarning("We couldn't confirm this location — check the spelling if needed.");
    }

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

        // Optimistic update of the local list so reopening the popover shows the new entry
        setDestinations(prev => [...prev, dest]);

        // Save coords if geocoding succeeded
        if (coords) {
            destinationApi.update(dest.id, {
                latitude: coords.lat,
                longitude: coords.lng,
            }).catch(console.error);
        }

        setNewName('');
        setNewCountry('');
        setShowCreateForm(false);
        setIsOpen(false);
        setLocationWarning(null);
        onDestinationChanged();
        addToast('Destination linked successfully', 'success');
    } catch (e) {
        console.error('Failed to create destination', e);
        setError('Failed to create destination. Please try again.');
    } finally {
        setIsCreating(false);
    }
};
```

Note: The geocode result (`coords`) is reused for the background patch — this eliminates the duplicate `geocodeAddress` call that was previously fired after save.

**Step 3: Clear warning when the user edits the name or country fields**

Update the `newName` input's onChange:

```typescript
onChange={e => {
    setNewName(e.target.value);
    if (locationWarning) setLocationWarning(null);
}}
```

Update the `newCountry` input's onChange:

```typescript
onChange={e => {
    setNewCountry(e.target.value);
    if (locationWarning) setLocationWarning(null);
}}
```

**Step 4: Render the warning inside the create form**

Inside the `showCreateForm` branch, add the warning between the inputs and the button row:

```tsx
{locationWarning && (
    <p className="text-xs text-amber-600">{locationWarning}</p>
)}
```

The create form section should look like:

```tsx
<div className="p-3 space-y-2">
    <input ... />  {/* City name */}
    <input ... />  {/* Country */}
    {locationWarning && (
        <p className="text-xs text-amber-600">{locationWarning}</p>
    )}
    <div className="flex gap-2">
        <button onClick={handleCreate} ...>
            {isCreating ? 'Creating…' : 'Create'}
        </button>
        <button onClick={() => { ... }}>Cancel</button>
    </div>
</div>
```

**Step 5: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 6: Manual smoke test**

- Open a day, click the destination picker badge
- Click "New destination…"
- Enter a gibberish city name (e.g. "zzzznotacity") and click Create
- Expect: brief loading, then warning appears in the form, destination is still created and linked
- Edit the name — warning should disappear
- Enter a real city (e.g. "Barcelona, Spain") — no warning, destination created normally

**Step 7: Commit**

```bash
git add frontend/components/days/DestinationPicker.tsx
git commit -m "feat: validate location before create in DestinationPicker"
```

---

## Task 3: DestinationForm — validate before save

**Files:**
- Modify: `frontend/components/destinations/useDestinationForm.ts`
- Modify: `frontend/components/destinations/DestinationForm.tsx`

The hook gains a `locationWarning` state returned to the form component. Validation runs before the API call in `handleSubmit`.

**Step 1: Add `locationWarning` state to the hook**

In `useDestinationForm.ts`, add a new state variable inside the hook body:

```typescript
const [locationWarning, setLocationWarning] = useState<string | null>(null);
```

**Step 2: Validate in `handleSubmit` before saving**

Replace the `handleSubmit` function with:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocationWarning(null);

    // Validate location (only for new destinations, not edits)
    if (!editingId) {
        const addressParts = [formData.name, formData.region, formData.country].filter(Boolean);
        const address = addressParts.join(', ');
        if (address) {
            const coords = await geocodeAddress(address);
            if (!coords) {
                setLocationWarning("We couldn't confirm this location — check the spelling if needed.");
            }
        }
    }

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

        // Background geocoding (skip if already validated — geocodeAddress was already called above)
        if (isNew && destinationId) {
            const addressParts = [formData.name, formData.region, formData.country].filter(Boolean);
            const address = addressParts.join(', ');
            if (address) {
                geocodeAddress(address).then(coords => {
                    if (coords) {
                        destinationApi.update(destinationId, {
                            ...formData,
                            latitude: coords.lat,
                            longitude: coords.lng,
                        }).catch(err => console.error('Failed to save geocoded coordinates for destination:', err));
                    }
                });
            }
        }

    } catch (error) {
        console.error('Error saving destination:', error);
        alert('Failed to save destination');
    }
};
```

**Step 3: Clear warning when name/region/country fields change**

Update the `updateField` function to clear the warning when location-relevant fields are edited:

```typescript
const updateField = <K extends keyof DestinationFormData>(
    field: K,
    value: DestinationFormData[K]
) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (['name', 'region', 'country'].includes(field as string) && locationWarning) {
        setLocationWarning(null);
    }
};
```

**Step 4: Return `locationWarning` from the hook**

Add it to the return object:

```typescript
return {
    formData,
    editingId,
    isEditing: editingId !== null,
    locationWarning,
    handleSubmit,
    startEdit,
    resetForm,
    updateField,
};
```

**Step 5: Accept and render `locationWarning` in `DestinationForm.tsx`**

Add the prop to the interface:

```typescript
interface DestinationFormProps {
    formData: DestinationFormData;
    isEditing: boolean;
    locationWarning?: string | null;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    updateField: <K extends keyof DestinationFormData>(
        field: K,
        value: DestinationFormData[K]
    ) => void;
}
```

Add `locationWarning` to the destructured props:

```typescript
export function DestinationForm({
    formData,
    isEditing,
    locationWarning,
    onSubmit,
    onCancel,
    updateField,
}: DestinationFormProps) {
```

Render the warning after the City/Place input (after the closing `</div>` of that field group, still inside the grid):

```tsx
{locationWarning && (
    <p className="col-span-full text-xs text-amber-600 -mt-2">
        {locationWarning}
    </p>
)}
```

**Step 6: Find where `DestinationForm` is rendered and pass `locationWarning`**

Search for usages of `<DestinationForm`:

```bash
grep -r "DestinationForm" frontend/app --include="*.tsx" -l
```

In each file that renders `<DestinationForm>`, destructure `locationWarning` from the `useDestinationForm` hook and pass it as a prop:

```tsx
const { formData, isEditing, locationWarning, handleSubmit, startEdit, resetForm, updateField } = useDestinationForm(...);

// ...

<DestinationForm
    formData={formData}
    isEditing={isEditing}
    locationWarning={locationWarning}
    onSubmit={handleSubmit}
    onCancel={resetForm}
    updateField={updateField}
/>
```

**Step 7: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 8: Manual smoke test**

- Open a trip's destinations page
- Click "Add Destination"
- Enter a gibberish city name and submit
- Expect: warning appears under the city field, destination is still saved
- Edit the city name — warning disappears
- Enter "London, United Kingdom" — no warning, saves cleanly

**Step 9: Commit**

```bash
git add frontend/components/destinations/useDestinationForm.ts \
        frontend/components/destinations/DestinationForm.tsx
git commit -m "feat: validate location before save in DestinationForm"
```

---

## Final check

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
