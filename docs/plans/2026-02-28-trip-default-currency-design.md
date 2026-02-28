# Trip Default Currency Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

Currency fields in transport, expense, and other cost forms all default to `'USD'` regardless of the trip. Users travelling in a non-USD currency must change the currency field on every single form entry. There is also a `budget_currency` field buried in the `TripContext` JSON blob that is not consistently used — the budget display in `BudgetProgress` has `'USD'` hardcoded entirely.

## Goal

Add a `default_currency` field to the `Trip` model. Propagate it through the React context so all cost forms pre-fill with the trip currency. Keep per-item override — forms stay editable.

## Out of Scope

- Currency conversion / normalisation (all amounts remain in their stored currency)
- Display of multiple currencies rolled up into one total

## Approach

`default_currency` lives directly on the `trips` table as a first-class column (not inside the `context` JSON blob). This is the single source of truth. The existing `context.budget_currency` is retired — existing data is migrated during the DB migration.

## Architecture

### Backend

**Model** (`app/models/trip.py`):
```python
default_currency = Column(String(10), nullable=False, default='USD')
```

**Schemas** (`app/schemas/trip.py`):
- `TripBase`: add `default_currency: str = 'USD'`
- `TripUpdate`: add `default_currency: Optional[str] = None`
- `Trip` / `TripWithOwnership` inherit automatically

**Migration** (`migrations/010_add_default_currency.py`):
1. Add `default_currency` column with `DEFAULT 'USD'`
2. Backfill: for each trip where `context` contains a `budget_currency` key, copy that value to `default_currency`
3. Handle both SQLite (local) and Postgres (production) dialects, following the existing pattern in `migrations/`

### Frontend Types (`frontend/lib/types.ts`)

Add to the `Trip` interface:
```ts
default_currency: string;
```

Add to `TripFormData`:
```ts
default_currency?: string;
```

### React Context (`frontend/lib/trip-context.tsx`)

Add `defaultCurrency: string` to `TripContextValue` and `TripProvider` props:
```ts
interface TripContextValue {
  tripId: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  tripContext?: TripContext | null;
  defaultCurrency: string;  // new
}
```

Remove `budget_currency` from the `TripContext` interface (the JSON shape). The trip page passes `trip.default_currency` into the provider.

Backward compat: in the trip page, seed `defaultCurrency` as `trip.default_currency ?? trip.context?.budget_currency ?? 'USD'` to cover old trips not yet migrated.

### Entry Points

**TripWizard Step 5** (`frontend/components/trips/TripWizard.tsx`):
- Rename state field `budget_currency` → `default_currency`
- Seed the initial value from `user.default_currency` (already in user settings) instead of hardcoded `'USD'`
- On submit, write to `trip.default_currency` (not `context`)

**TripSettings** (`frontend/components/trips/TripSettings.tsx`):
- Wire the existing currency field to `trip.default_currency` via `PATCH /trips/{id}`
- Remove the `budget_currency` read from `context`

### Form Pre-filling

All forms inside a `TripProvider` call `useTripContext()` to get `defaultCurrency`:

| Form | Change |
|---|---|
| `TransportForm.tsx` | `useState(initialData?.currency ?? defaultCurrency)` |
| `TransportOptionForm.tsx` | same pattern |

No prop drilling needed — these components are always rendered inside `TripProvider` on the trip pages.

### Budget Display

**`BudgetProgress.tsx`**: Replace hardcoded `currency: 'USD'` in the `Intl.NumberFormat` call with `currency: defaultCurrency` read from `useTripContext()`.

**`BudgetBreakdown.tsx`**: Same fix if a similar hardcoded value exists.

## Touch Points

| Layer | File(s) |
|---|---|
| Backend model | `app/models/trip.py` |
| Backend schema | `app/schemas/trip.py` |
| Migration | `migrations/010_add_default_currency.py` |
| Frontend types | `frontend/lib/types.ts` |
| React context | `frontend/lib/trip-context.tsx` |
| Trip page | `frontend/app/trips/[id]/page.tsx` |
| Day page | `frontend/app/trips/[id]/days/[dayId]/page.tsx` (passes defaultCurrency into TripProvider if not already) |
| Wizard | `frontend/components/trips/TripWizard.tsx` |
| Settings | `frontend/components/trips/TripSettings.tsx` |
| Transport form | `frontend/components/transport/TransportForm.tsx` |
| Transport option form | `frontend/components/transport/TransportOptionForm.tsx` |
| Budget display | `frontend/components/budget/BudgetProgress.tsx`, `BudgetBreakdown.tsx` |

## Acceptance Criteria

1. A new trip created via the wizard stores `default_currency` on the `Trip` row (not in the context blob)
2. The wizard currency selector defaults to the user's `default_currency` from settings
3. Opening `TransportForm` on a trip with `default_currency = 'EUR'` shows `EUR` pre-filled in the cost currency field
4. Changing the currency in that form to `'USD'` still saves `'USD'` for that transport (per-item override works)
5. `BudgetProgress` formats the budget amount using the trip's `default_currency`, not `'USD'`
6. Existing trips with `context.budget_currency` set have their `default_currency` populated correctly after migration
7. All backend tests pass; `npm run lint && npx tsc --noEmit` pass
