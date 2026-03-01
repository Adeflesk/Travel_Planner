# Unified Activity Model — Design Doc

**Date:** 2026-03-01
**Status:** Approved

## Problem

The app has two separate, unconnected activity systems:

- **`Activity`** (`activities` table) — destination-linked, shown in Activities tab and Destinations tab
- **`DayActivity`** (`day_activities` table) — day-linked, shown only in the day builder

Activities created in the day builder never appear in the Activities tab or under Destinations. This is confusing and creates duplicate/split data.

## Decision

Extend `DayActivity` into the single canonical activity model. Drop the old `Activity` model and `activities` table (no migration — fresh start).

## Data Model

Table: `day_activities` (extended)

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `day_id` | Integer FK → trip_days, nullable | Required if no destination_id |
| `destination_id` | Integer FK → destinations, nullable | **new** — required if no day_id |
| `start_time` | String(5) HH:MM, nullable | Was required; now optional |
| `end_time` | String(5), nullable | |
| `title` | Text, not null | |
| `category` | String(32) | |
| `location` | Text | |
| `notes` | Text | |
| `cost` | Float | |
| `currency` | String(3) | |
| `booked` | Boolean default False | |
| `sort_order` | Integer default 0 | |
| `is_todo` | Boolean default False | **new** |
| `is_completed` | Boolean default False | **new** |

**Invariant:** at least one of `day_id` or `destination_id` must be non-null (enforced in backend, not DB constraint).

**Auto-population:** when creating from the day builder, `destination_id` is automatically set from `day.destination_id` if the day has a destination assigned.

## API Endpoints

Old `activities` router is deleted. Unified routes:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/trips/{trip_id}/activities` | All trip activities (Activities tab) |
| `GET` | `/trip-days/{day_id}/activities` | Activities on a day (day builder) |
| `GET` | `/destinations/{destination_id}/activities` | Activities under a destination |
| `POST` | `/activities/` | Create any activity |
| `PATCH` | `/activities/{id}` | Update any activity |
| `DELETE` | `/activities/{id}` | Delete any activity |

`GET /trips/{trip_id}/activities` returns activities where `day_id` is in a trip day of this trip, OR `destination_id` is in a destination of this trip.

New routes live in a new clean `app/routers/activities.py`. The existing day-activity GET/POST/PATCH/DELETE routes in `trip_days.py` are removed and replaced.

## Frontend Changes

### `lib/types.ts`
- `DayActivity`: add `destination_id?`, `is_todo`, `is_completed`; make `start_time` optional
- Remove `Activity`, `ActivityFormData`

### `lib/api.ts`
- Remove `activityApi`
- Update `dayApi.createActivity` to accept `destination_id`
- Add `dayApi.getByTrip(tripId)` → `GET /trips/{trip_id}/activities`
- Add `dayApi.getByDestination(destId)` → `GET /destinations/{dest_id}/activities`

### Day builder (`components/days/`)
- `useDayBuilder`: pass `destination_id` from `day.destination_id` when creating activities

### Activities tab (`components/trip-activities/`)
- `useTripActivities`: replace `tripApi.getDestinationsWithActivities` with `dayApi.getByTrip`
- Group results by `destination_id` for display
- Support creating floating activities (destination picker, no day required)

### Destinations tab (`components/destinations/` + `components/activities/`)
- Replace `activityApi.getByDestinationId` with `dayApi.getByDestination`
- Delete `components/activities/` folder — replaced by reuse of day-builder components

## Files Deleted
- `app/models/activity.py`
- `app/schemas/activity.py`
- `app/routers/activities.py` (old)
- `frontend/components/activities/` (entire folder)

## Migration
- Drop `activities` table (no data to preserve)
- Add columns to `day_activities`: `destination_id`, `is_todo`, `is_completed`
- Make `start_time` nullable
