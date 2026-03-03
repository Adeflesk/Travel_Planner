# Mapbox Search/Autofill Design

**Date:** 2026-03-03
**Status:** Approved

## Goal

Replace the plain text location inputs in the activity and destination forms with a Mapbox Search autocomplete dropdown. Users pick from verified suggestions, coordinates are captured before save, and the backend geocoding fallback is preserved for free-text entries.

## Approach

Use `@mapbox/search-js-react` (Option A). It handles debouncing, session tokens, keyboard navigation, and suggestion rendering. The public `pk.*` token is safe to expose on the frontend.

## Architecture

### New component

`frontend/components/shared/LocationSearchBox.tsx` — wraps the Mapbox `SearchBox`. Props:
- `accessToken: string`
- `value: string` — controlled input value
- `placeholder?: string`
- `onRetrieve: (result: { text: string; lat: number; lng: number }) => void`
- `onTextChange: (text: string) => void`

Styled to match existing form inputs.

### Activity form (`frontend/components/days/ActivityForm.tsx`)

Replace `<input location>` with `<LocationSearchBox>`. On `onRetrieve`, call react-hook-form's `setValue` for `location`, `latitude`, and `longitude`. Fields already exist on `DayActivity`.

### Destination form

**`frontend/components/destinations/DestinationForm.tsx`** — replace the "City/Place" `<input name>` with `<LocationSearchBox>`.

**`frontend/components/destinations/useDestinationForm.ts`** — on `onRetrieve`:
- Set `name` from the feature's `text` property
- Set `country` from the feature's context array (entry with `id` prefixed `country.`)
- Store `latitude` and `longitude` in form state

Remove the existing `geocodeAddress` (Nominatim) call and the follow-up `destinationApi.update()` coord-persistence call. Add optional `latitude?: number` and `longitude?: number` to `DestinationFormData` so coords are included in the initial `destinationApi.create()` payload.

Remove the `locationWarning` state — it existed to surface Nominatim failures, which are no longer relevant with autocomplete.

### Environment

Add `NEXT_PUBLIC_MAPBOX_TOKEN` to:
- `.env` (local, not committed)
- `.env.example`
- Vercel environment variables (production)

## Data Flow

| Scenario | Coords in form? | Backend geocoding? |
|---|---|---|
| User picks from dropdown | Yes — from `onRetrieve` | Skipped (latitude already set) |
| User types, doesn't pick | No | Runs as fallback (silent) |
| Editing existing record, no change | Not sent | Not triggered |

## Fallback

If the user types a location string but never picks a suggestion, `latitude`/`longitude` remain `null`. The backend geocoding runs as today — the save never fails.

## Testing

**Unit tests** for `LocationSearchBox`:
- Renders with correct placeholder
- Calls `onRetrieve` with `{ text, lat, lng }` on suggestion selection
- Calls `onTextChange` on free-text input

**Manual checklist:**
- [ ] Create activity with location → pick from dropdown → save → pin appears on map immediately
- [ ] Create destination → pick from dropdown → `name` and `country` auto-filled → coords stored on first save (no second API call)
- [ ] Type location without picking → save → backend geocodes silently, no error
- [ ] Edit existing record without changing location → existing coords preserved
