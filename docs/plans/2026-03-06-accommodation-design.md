# Accommodation Feature Design

**Date:** 2026-03-06
**Status:** Approved

---

## Problem

Accommodation is currently not a first-class model. It piggybacks on `Expense` records tagged with `category='accommodation'`, displayed via a thin `AccommodationInfo` component that shows description, amount, and booked/paid status. There is no check-in/out tracking, booking reference, contact info, cancellation policy, or day builder visibility.

---

## Approach

**Destination-scoped accommodation.** Each destination owns one or more accommodation records. Accommodation is managed from the destination panel and surfaces as contextual badges in the day builder. Cost auto-syncs to the expense/budget system.

---

## Data Model

New `accommodations` table:

| Field | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `destination_id` | int FK | -> Destination (required) |
| `trip_id` | int FK | -> Trip (for efficient trip-level queries) |
| `name` | string | e.g. "Hotel Le Marais" |
| `address` | string? | optional |
| `check_in_date` | date | |
| `check_out_date` | date | |
| `cost` | float? | total cost; drives expense sync |
| `currency` | string? | defaults to trip currency |
| `confirmation_number` | string? | booking reference |
| `booking_url` | string? | |
| `contact_phone` | string? | |
| `cancellation_policy` | string? | free text |
| `cancel_by_date` | date? | |
| `booked` | bool | default false |
| `paid` | bool | default false |
| `notes` | string? | |
| `expense_id` | int FK? | -> Expense (nullable, tracks synced expense) |

`nights` is not stored — computed as `check_out_date - check_in_date`.

### Expense Sync

Managed by `accommodation_service.py`:

- **Create/Update:** If `cost > 0`, upsert a linked `Expense` with `category='accommodation'`, `description=name`, `date=check_in_date`, `booked`/`paid` mirrored from the accommodation record. Store the resulting `expense_id` on the accommodation.
- **Delete:** Cascade delete the linked expense if one exists.
- If `cost` is removed or set to 0, delete the linked expense and clear `expense_id`.

---

## Backend API

### Destination-scoped endpoints

```
GET    /trips/{trip_id}/destinations/{destination_id}/accommodations
POST   /trips/{trip_id}/destinations/{destination_id}/accommodations
PUT    /trips/{trip_id}/destinations/{destination_id}/accommodations/{id}
DELETE /trips/{trip_id}/destinations/{destination_id}/accommodations/{id}
```

### Trip-level convenience endpoint

```
GET    /trips/{trip_id}/accommodations
```

Returns all accommodations across all destinations for a trip. Used by the day builder to fetch badges in a single call.

### Files to create/modify

- `app/models/accommodation.py` — SQLAlchemy model
- `app/schemas/accommodation.py` — Pydantic schemas (Create, Update, Response)
- `app/services/accommodation_service.py` — CRUD + expense sync logic
- `app/routers/accommodations.py` — router
- `app/main.py` — register router
- `migrations/` — migration script for new table

---

## Frontend

### Types (`frontend/lib/types.ts`)

```ts
export interface Accommodation {
  id: number;
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked: boolean;
  paid: boolean;
  notes?: string;
  expense_id?: number | null;
}

export interface AccommodationCreate {
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked?: boolean;
  paid?: boolean;
  notes?: string;
}

export type AccommodationUpdate = Partial<AccommodationCreate>;
```

### API client (`frontend/lib/api.ts`)

New `accommodationApi` object with `getByDestination`, `getByTrip`, `create`, `update`, `delete`.

### Components

#### `components/accommodations/`

- `AccommodationCard.tsx` — displays a single accommodation record (name, check-in/out, nights, cost, booked/paid badges, edit/delete actions)
- `AccommodationForm.tsx` — modal form with all fields; nights auto-calculated live from check-in/out dates
- `AccommodationList.tsx` — list of cards + "Add Accommodation" button; fetches via `useAccommodations`
- `useAccommodations.ts` — hook for destination-scoped CRUD (`getByDestination`, `create`, `update`, `delete`)
- `useTripAccommodations.ts` — hook for trip-level fetch (used by day builder)
- `index.ts` — barrel exports

#### Destination Panel

`DestinationItem.tsx` — add `<AccommodationList destinationId={destination.id} tripId={trip.id} />` below the dates section, replacing `<AccommodationInfo />`.

Remove `AccommodationInfo.tsx` entirely.

### Day Builder Badges

`useTripAccommodations(tripId)` fetches all accommodations for the trip once. Each `TripDay` in the day builder checks if `day.date` falls within any accommodation's `[check_in_date, check_out_date)` range:

- **Check-in day** (`day.date === check_in_date`): green badge — "Check-in: {name}"
- **Middle days** (`check_in_date < day.date < check_out_date`): subtle grey badge — "Staying at: {name}"
- **Check-out day** (`day.date === check_out_date`): amber badge — "Check-out: {name}"

Badges render below the day date/header, above the timeline, alongside the existing destination chip.

---

## Migration

- New `accommodations` table using `SERIAL PRIMARY KEY` (Postgres-compatible)
- Boolean columns use `DEFAULT FALSE` (not `DEFAULT 0`)
- Foreign keys: `destination_id`, `trip_id`, `expense_id` (nullable)
- SQLite-compatible via SQLAlchemy ORM (no raw SQL)

---

## Out of Scope

- Multiple rooms per accommodation record
- Photo attachments
- Map pin for accommodation address (can be added later)
- Accommodation-specific packing suggestions
