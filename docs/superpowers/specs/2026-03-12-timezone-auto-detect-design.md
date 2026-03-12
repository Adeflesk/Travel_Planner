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
6. A confirmation line displays: **Pacific Time (PST)** · [Change]

If no destination is entered, the timezone falls back to the user's browser timezone (current behavior).

### UI Changes — Wizard Step 1

**Before:**
- Plain text `<Input>` for "First destination"
- Plain text `<Input>` for "Departing from"
- `<AutocompleteInput>` with ~400 IANA timezone strings

**After:**
- `<TransportLocationSearch>` for "First destination" (Mapbox-powered, with timezone auto-detect)
- `<TransportLocationSearch>` for "Departing from" (Mapbox-powered, coordinates captured)
- Timezone `<AutocompleteInput>` removed from default view
- New read-only timezone display line: `Timezone: Pacific Time (PST) · [Change]`
- Clicking "Change" expands the existing `<AutocompleteInput>` as a manual fallback

### Component Changes

#### `TransportLocationSearch` (modify)
- Make `transportType` prop optional (default: no POI category filter)
- When omitted, the component performs general city/place search without filtering to airports, train stations, etc.
- Add optional `label` prop for use outside transport forms
- No changes to existing transport form behavior

#### `TripWizard.tsx` (modify)
- Import and use `TransportLocationSearch` for both destination fields
- Wire `onSelect` callback to:
  - Store coordinates in `validatedCoords.current`
  - Auto-fill `data.timezone` from `location.timezone`
- Remove Nominatim `geocodeAddress` import and validation logic
- Remove the default timezone `<AutocompleteInput>`
- Add timezone confirmation display with "Change" toggle
- Add `formatTimezoneLabel()` for friendly display

#### `timezone-utils.ts` (modify)
- Add `formatTimezoneLabel(tz: string, atDate?: Date): string`
  - Maps IANA strings to friendly labels: `America/Los_Angeles` → `Pacific Time (PST)`
  - Uses `Intl.DateTimeFormat` to get the abbreviation dynamically (handles DST correctly)
  - Format: `{longName} ({abbreviation})`

### What stays the same

- Backend `/timezone` endpoint — no changes
- `timezoneApi.lookup()` in `api.ts` — reused as-is
- Database storage format — still IANA strings
- `TransportLocationSearch` behavior in transport forms — unchanged
- `geocode-utils.ts` — stays in codebase (may be used elsewhere), just no longer imported by wizard

### Edge Cases

- **No destination entered:** Falls back to browser's local timezone
- **Timezone lookup fails:** Falls back to browser timezone, no error shown (timezone is optional)
- **User changes destination after timezone is set:** Timezone updates to match the new destination
- **Mapbox token missing/invalid:** Gracefully degrades — text input still works, no suggestions appear, timezone falls back to browser default
- **Manual override then destination change:** If user manually changed timezone via "Change", a destination change should still update it (the auto-detect takes precedence unless the user re-overrides)
