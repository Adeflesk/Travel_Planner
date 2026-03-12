# Auto-detect Timezone from First Destination

**Date:** 2026-03-12
**Status:** Approved

## Problem

The trip wizard's timezone picker shows ~400 raw IANA timezone strings (e.g., `America/Los_Angeles`). Users searching by city name ("Seattle") or common abbreviation ("PST") find nothing. The experience is confusing and error-prone.

## Solution

Auto-detect the trip timezone from the "First destination" field using the existing Mapbox Search API + backend timezone lookup. Replace the manual timezone picker with a small confirmation display that allows manual override.

## Design

### Flow

1. User types a destination (e.g., "Seattle") into the "First destination" field
2. Mapbox Search API returns suggestions; user selects one
3. Coordinates are retrieved from Mapbox
4. `timezoneApi.lookup(lat, lng)` calls the backend `/timezone` endpoint (uses `timezonefinder` library)
5. Returned IANA timezone string auto-fills `data.timezone`
6. A confirmation line displays the friendly label, e.g.: **Pacific Standard Time (PST)** · [Change]

If no destination is entered, the timezone falls back to the user's browser timezone (current behavior).

### UI Changes — Wizard Step 1

**Before:**
- Plain text `<Input>` for "First destination"
- Plain text `<Input>` for "Departing from"
- `<AutocompleteInput>` with ~400 IANA timezone strings

**After:**
- `<TransportLocationSearch>` for "First destination" (Mapbox-powered, with timezone auto-detect)
- `<TransportLocationSearch>` for "Departing from" (Mapbox-powered, coordinates captured)
- Timezone `<AutocompleteInput>` hidden by default behind a boolean toggle (`showTimezoneOverride`)
- New read-only timezone display line: `Timezone: Pacific Standard Time (PST) · [Change]`
- Clicking "Change" reveals the existing `<AutocompleteInput>` (still using `getSupportedTimezones()`) as a manual fallback

### Component Changes

#### `TransportLocationSearch` (modify)
- Change `transportType: string` to `transportType?: string` in the Props interface
- Update the `category` lookup (line 62) to handle `undefined`: `const category = transportType ? (CATEGORY[transportType] ?? null) : null;`
- When `transportType` is omitted, the component performs general city/place search without filtering to airports, train stations, etc.
- Add optional `label?: string` prop. When provided, render a `<label>` element above the input using the same `text-sm font-medium text-slate-700` classes used by the `Input` component.
- No changes to existing transport form behavior (all current callers pass `transportType`)

#### `TripWizard.tsx` (modify)
- Import and use `TransportLocationSearch` for both "Departing from" and "First destination" fields
- Wire `onSelect` callback to:
  - Store coordinates in `validatedCoords.current`
  - Auto-fill `data.timezone` from `location.timezone` (if non-null)
- Remove Nominatim `geocodeAddress` import and validation logic
- Remove location warning UI — Mapbox provides real-time validation via the suggestion list
- Hide the timezone `<AutocompleteInput>` by default; show it when `showTimezoneOverride` is true
- Keep the `timezones` memo (`useMemo(() => getSupportedTimezones(), [])`) for the manual fallback
- Add timezone confirmation display with "Change" toggle
- Use `formatTimezoneLabel()` for friendly display, passing `data.start_date` as `atDate` for DST-accurate abbreviations

**Free-text input (no Mapbox selection):** If the user types a location but does not select a Mapbox suggestion, no coordinates are captured and no timezone is auto-detected. The text value is still stored (for display purposes), but the timezone falls back to browser default. This replaces the old Nominatim validation — Mapbox's real-time suggestion list serves as implicit validation.

#### `timezone-utils.ts` (modify)
- Add `formatTimezoneLabel(tz: string, atDate?: Date): string`
  - Uses `Intl.DateTimeFormat` with `timeZoneName: 'long'` for the full name and reuses the existing `getTimezoneAbbreviation()` for the short form
  - Format: `{longName} ({abbreviation})` — e.g., `Pacific Standard Time (PST)`
  - Accepts Intl-native output directly (e.g., "Pacific Standard Time" not hand-shortened "Pacific Time")
  - The `atDate` parameter ensures DST-correct abbreviations (e.g., shows "PDT" for a July trip viewed in January)
  - Falls back to the raw IANA string if Intl formatting fails

### What stays the same

- Backend `/timezone` endpoint — no changes
- `timezoneApi.lookup()` in `api.ts` — reused as-is
- Database storage format — still IANA strings
- `TransportLocationSearch` behavior in transport forms — unchanged (all existing callers pass `transportType`)
- `geocode-utils.ts` — stays in codebase (used elsewhere), just no longer imported by wizard

### Edge Cases

- **No destination entered:** Falls back to browser's local timezone
- **Timezone lookup fails (network error):** Falls back to browser timezone, no error shown
- **Backend returns null timezone (ocean/remote coordinates):** Falls back to browser timezone, same as lookup failure
- **User changes destination after timezone is set:** Timezone updates to match the new destination
- **Mapbox token missing/invalid:** Gracefully degrades — text input still works, no suggestions appear, timezone falls back to browser default
- **Free-text without Mapbox selection:** No coordinates or timezone captured; timezone stays at browser default
- **Manual override then destination change:** Auto-detect overwrites the manual timezone. This is intentional — the destination timezone is the most relevant for itinerary planning, and requiring a confirmation dialog would add friction to the common case. Users who need a non-destination timezone can use "Change" again after selecting their destination.
