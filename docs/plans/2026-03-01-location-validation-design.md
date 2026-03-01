# Location Validation Design

**Date:** 2026-03-01
**Status:** Approved

## Problem

Destinations and home bases can be saved with misspelled or unrecognisable location strings. Geocoding currently happens in the background after save, so users get no feedback if a location can't be resolved — it silently fails and the destination ends up without coordinates (breaking maps and weather).

## Goal

Validate location strings via Nominatim **before** saving, at every place a destination or location is created. Show a soft inline warning if geocoding fails; always allow the save to proceed.

## Scope — All Creation Points

| Location | Fields validated | Entry point |
|---|---|---|
| TripWizard step 1 | `home_base`, `first_destination` | `frontend/components/trips/TripWizard.tsx` |
| DestinationPicker inline form | `name` + `country` | `frontend/components/days/DestinationPicker.tsx` |
| Destinations page full form | `name` + `region` + `country` | `frontend/components/destinations/useDestinationForm.ts` |

## Behaviour

- On submit/Next click, geocode the location string before the API call.
- If `geocodeAddress()` returns `null`: show a warning beneath the field and proceed with the save anyway.
- If `geocodeAddress()` resolves: no visible change, save proceeds as normal.
- Warning clears when the user edits the field.
- Validation is non-blocking — the save always completes.

## Warning Message

> "We couldn't confirm this location — check the spelling if needed."

## UX Details

### TripWizard (step 1 → Next)
- "Next Step →" button enters a loading state while validation runs ("Checking…").
- `home_base` and `first_destination` validated in parallel.
- Warnings appear under each field independently.
- `isValidating` state added to the wizard; button is disabled during validation.
- Second click on Next (warnings already shown) proceeds immediately — no re-validation.

### DestinationPicker (inline create)
- "Create" button shows a spinner while geocoding runs.
- Warning shown inside the inline form if geocoding fails.
- Create proceeds regardless.

### useDestinationForm (destinations page)
- `locationWarning: string | null` added to hook return value.
- Form component renders warning below the Name field.
- Warning clears on any `name`, `region`, or `country` field change.

## Architecture

No new shared hook needed. Each creation point adds:
1. A `locationWarning` state variable (string | null).
2. A call to `geocodeAddress()` before the API call.
3. Warning UI beneath the relevant input.

`geocodeAddress()` in `geocode-utils.ts` already returns `null` gracefully on failure — no changes needed to it.

## Out of Scope

- Editing existing destinations (validation on edit is a separate concern).
- Transport origin/destination fields (already geocoded in background post-save; separate feature).
- Hard-blocking saves based on geocoding result.
