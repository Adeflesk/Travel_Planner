# Frontend Unit Test Plan

**Date:** 2026-03-06  
**Current coverage:** ~12% of source files have any unit tests (83.6% within those files only)  
**Target:** ≥70% statement coverage across all source files

---

## Current State

### ✅ Already covered

| File | Stmt% | Branch% |
|---|---|---|
| `components/days/DayForm.tsx` | 100 | 100 |
| `components/days/DayList.tsx` | 96 | 85 |
| `components/days/useDayBuilder.ts` | 100 | 90 |
| `components/ui/Button.tsx` | 100 | 72 |
| `lib/currency-utils.ts` | 100 | 100 |
| `lib/transport-config.ts` | 100 | 100 |
| `lib/date-constraints.ts` | 96 | 97 |
| `lib/datetime-utils.ts` | 93 | 100 |
| `lib/timezone-utils.ts` | 60 | 62 |

### ❌ Zero coverage (no test file exists)

Every component in `budget/`, `dashboard/`, `destinations/`, `expenses/`, `packing/`, `transport/`, `trips/`, `timeline/`, `weather/`, `shared/`, `trip-activities/`, and all of `lib/api.ts`, `auth-context.tsx`, `trip-context.tsx`, `geocode-utils.ts`, `retry-fetch.ts`, `destination-day-utils.ts`, `useGeocode.ts`, `useExchangeRates.ts`.

---

## Tooling

- **Test runner:** Vitest
- **Environment:** jsdom (configured in `vitest.config.ts`)
- **Setup file:** `vitest.setup.ts` — provides `@testing-library/jest-dom/vitest` matchers and automatic `cleanup()` after each test
- **Mocking pattern:** `vi.mock('@/lib/api', () => ({ ... }))` at the top of each test file
- **Hook testing:** `renderHook` + `act` from `@testing-library/react`
- **Component testing:** `render` + `screen` + `fireEvent` / `userEvent` from `@testing-library/react`
- **Coverage provider:** `@vitest/coverage-v8` — run with `npx vitest run --coverage`

---

## Tier 1 — Pure Logic Utilities (highest ROI, no DOM needed)

These are pure functions or thin async wrappers. Tests are fast and zero-dependency.

---

### 1. `lib/retry-fetch.ts`

**Test file:** `frontend/lib/retry-fetch.test.ts`

| Test | Description |
|---|---|
| Returns response on first success | `fetch` resolves `ok` → return immediately, no retry |
| Does not retry 4xx errors | `fetch` returns `400` → return the response immediately (not retryable) |
| Retries on 5xx and resolves on next attempt | `fetch` returns `500` once, then `200` → resolved after one retry |
| Exhausts all retries and throws | `fetch` always throws → throw after `retries + 1` attempts |
| Respects custom `retries` option | Pass `retries: 1` → only 2 total attempts |
| Respects custom `backoff` option | Use `vi.useFakeTimers()` to assert exponential delay: attempt 0 → `backoff*1`, attempt 1 → `backoff*2` |
| Retries on network error (fetch throws) | `fetch` rejects with `TypeError` → retried and eventually rethrown |

**Setup:** mock global `fetch` with `vi.spyOn(global, 'fetch')`, use `vi.useFakeTimers()` to avoid real delays.

---

### 2. `lib/geocode-utils.ts`

**Test file:** `frontend/lib/geocode-utils.test.ts`

| Test | Description |
|---|---|
| Returns `null` for empty string | `geocodeAddress('')` → `null` without calling fetch |
| Returns `null` for whitespace-only | `geocodeAddress('   ')` → `null` |
| Parses `lat`/`lon` from Nominatim response | Mock `retryFetch` to return `[{ lat: '51.5', lon: '-0.1' }]` → `{ lat: 51.5, lng: -0.1 }` |
| Returns `null` when response is empty array | Mock returns `[]` → `null` |
| Returns `null` on HTTP error | Mock returns `{ ok: false, status: 503 }` → `null` |
| Returns `null` on network exception | Mock throws → `null` (graceful degradation) |
| Serialises concurrent calls through queue | Call `geocodeAddress` twice concurrently; assert the second invocation of `retryFetch` starts after the first resolves |

**Setup:** `vi.mock('@/lib/retry-fetch')` and `vi.mock('@/lib/config', () => ({ NOMINATIM_USER_AGENT: 'test' }))`.

---

### 3. `lib/destination-day-utils.ts` — `autoCreateDaysForDestination`

**Test file:** `frontend/lib/destination-day-utils.test.ts`

| Test | Description |
|---|---|
| Returns empty array when `arrivalDate` is missing | Call with `arrivalDate: ''` → `[]` |
| Returns empty array when `departureDate` is before `arrivalDate` | Inverted date window → `[]` |
| Creates one day per date in range | 3-day range, no existing days → 3 calls to `dayApi.createDay` |
| Skips existing days that already have a `destination_id` | Existing day with `destination_id` set → no PATCH, pushed as-is |
| PATCHes existing days that have no `destination_id` | Existing day with `destination_id: null` → calls `dayApi.updateDay` |
| Handles `createDay` API failure gracefully | Mock rejection → error logged, no throw |
| Handles `updateDay` API failure gracefully | Mock rejection → falls back to original day object |
| Single-day range (arrival === departure) | Only one day created |

**Setup:** `vi.mock('@/lib/api', () => ({ tripApi: { getDays: vi.fn() }, dayApi: { createDay: vi.fn(), updateDay: vi.fn() } }))`.

---

### 4. `lib/timezone-utils.ts` — fill the 40% gap

**Test file:** Already exists at `lib/timezone-utils.test.ts` — add cases for currently uncovered functions.

| Function | Tests to add |
|---|---|
| `formatLocalTime(date, tz)` | Known UTC datetime → formatted string in target tz |
| `formatLocalTime` with invalid timezone | Falls back gracefully |
| `convertToUTC(localStr, tz)` | Converts local time string to UTC ISO string |
| `convertFromUTC(utcStr, tz)` | Reverse of above |
| `getTimezoneAbbreviation(tz)` | Known tz → abbreviation string (e.g. `'GMT'`) |
| `getFlightTimezone(airport)` | Mock lookup → returns expected tz string |
| `lookupAirportTimezone(code)` | Known IATA code → tz; unknown code → `undefined` |

---

## Tier 2 — Custom Hooks (medium complexity, high risk)

Use `renderHook` + `act` throughout. Mock `@/lib/api` per file.

---

### 5. `components/budget/useBudget.ts`

**Test file:** `frontend/components/budget/useBudget.test.ts`

| Test | Description |
|---|---|
| Sets `loading: true` on mount, `false` after fetch | Assert intermediate and final states |
| Populates `budget` on successful fetch | Mock `tripApi.getBudgetStatus` resolved → budget state set |
| Sets `error` string on API failure | Mock rejection → `error` is non-null, `budget` is null |
| `refetch` re-calls the API | Call `result.current.refetch()`, assert API called twice |
| Does nothing when `tripId` is falsy | Pass `tripId: 0` → API never called |

---

### 6. `components/expenses/useExpenseForm.ts`

**Test file:** `frontend/components/expenses/useExpenseForm.test.ts`

> **Note:** `useExpenseForm` calls `useTripCurrency()` — mock `@/lib/trip-context`.

| Test | Description |
|---|---|
| Initial `formData` has empty fields and today's date | Check `formData.amount === 0`, `formData.category === ''` etc. |
| `updateField` updates a single field | Call `updateField('category', 'food')` → `formData.category === 'food'` |
| `startEdit` populates `formData` from an existing expense | Check all expense fields reflected; `isEditing === true` |
| `resetForm` returns to initial state | After `startEdit`, call `resetForm()` → blank form, `isEditing === false` |
| `handleSubmit` in create mode — budget not exceeded → calls `expenseApi.create` | Mock `checkBudget` → `{ would_exceed: false }`, `create` resolves → `onSuccess` called |
| `handleSubmit` in create mode — budget exceeded → sets `budgetImpact` and halts | Mock `checkBudget` → `{ would_exceed: true }` → `budgetImpact` set, `create` not called |
| `confirmSubmit` overrides the budget warning and creates | Call `confirmSubmit()` → `expenseApi.create` called, `budgetImpact` cleared |
| `cancelBudgetAlert` clears `budgetImpact` | Call → `budgetImpact === null` |
| `handleSubmit` in edit mode → calls `expenseApi.update` | After `startEdit`, submit → `update` called, not `create` |
| API failure shows alert | Mock `create` rejection → `alert` called |

---

### 7. `components/transport/useTransport.ts`

**Test file:** `frontend/components/transport/useTransport.test.ts`

| Test | Description |
|---|---|
| Loads transport on mount | Mock `transportApi.getByDayId` → items populated |
| Handles load failure silently | Mock rejection → `loading: false`, items remain empty |
| `createTransport` calls API then reloads | Mock `transportApi.create` → `getByDayId` called again |
| `createTransport` fires background geocoding when no coords | Mock `geocodeAddress` → `transportApi.update` called with lat/lng |
| `createTransport` skips geocoding when coords provided | Provide `origin_latitude` → `geocodeAddress` not called |
| `updateTransport` calls API then reloads | Assert `transportApi.update` + second `getByDayId` call |
| `deleteTransport` calls API then reloads | Assert `transportApi.delete` + reload |

---

### 8. `components/destinations/useDestinations.ts`

**Test file:** `frontend/components/destinations/useDestinations.test.ts`

| Test | Description |
|---|---|
| Loads destinations on mount | Mock `destinationApi.getByTripId` → populated |
| `addDestination` calls create API then reloads | |
| `updateDestination` calls update API then reloads | |
| `deleteDestination` calls delete API then reloads | |
| `reorderDestinations` sends correct order patch | |

---

## Tier 3 — UI Components (rendering + interaction tests)

---

### 9. `components/days/DayHeader.tsx`

**Test file:** `frontend/components/days/DayHeader.test.tsx`

Mock `./DestinationPicker` (returns `null`) to isolate `DayHeader`.

| Test | Description |
|---|---|
| Renders the day number and month from `day.date` | Date `'2030-06-15'` → `15` and `Jun` visible |
| Renders the weekday name | `'2030-06-15'` is a Saturday → `'Saturday'` rendered |
| Renders `day.title` when present | Title `'Museum Day'` → visible |
| Omits subtitle when `day.title` is undefined | No extra heading rendered |
| Renders `day.notes` when present | Notes text visible |
| Calls `onEditDay` when settings button clicked | `fireEvent.click(settingsBtn)` → mock called once |
| Calls `onAddActivity` when Activity button clicked | |
| Renders Transport button when `onAddTransport` provided | Button visible |
| Omits Transport button when `onAddTransport` is undefined | Button absent |
| Calls `onAddTransport` when Transport button clicked | |

---

### 10. `components/days/DayTimeline.tsx`

**Test file:** `frontend/components/days/DayTimeline.tsx.test.tsx`

Mock `ActivityBlock` and `TransportBlock` to avoid their own rendering complexity.

| Test | Description |
|---|---|
| Renders hour labels 7am – 11pm (17 labels) | All 17 `{n}am/pm` labels visible |
| Renders one `ActivityBlock` per scheduled activity | 2 activities → 2 mock blocks rendered |
| Passes `highlighted` when `highlightedActivityId` matches | Prop forwarded correctly |
| Calls `onEditActivity` with correct activity on block click | |
| Renders `TransportBlock` for transport with a departure time | |
| Does not render `TransportBlock` when time is null | |
| Renders "Anytime / Unscheduled" section when `unscheduled` non-empty | Heading visible |
| Hides "Anytime / Unscheduled" when list is empty | No heading |
| Calls `onEditActivity` when unscheduled item clicked | |
| Renders "Transport — no time set" section for timeless transports | |

---

### 11. `components/expenses/BudgetExceededModal.tsx`

**Test file:** `frontend/components/expenses/BudgetExceededModal.test.tsx`

| Test | Description |
|---|---|
| Not mounted when `budgetImpact` is null | Component renders nothing |
| Shows over-by amount when `would_exceed: true` | Dollar figure visible |
| "Add Anyway" button calls `onConfirm` | |
| "Cancel" button calls `onCancel` | |

---

## Tier 4 — Integration / Context hooks

These require wrapping with context providers in tests.

### 12. `lib/auth-context.tsx`

| Test | Description |
|---|---|
| Provides `{ user: null, loading: true }` on initial render | |
| Calls `/auth/me` on mount and sets user | |
| `login()` stores token and sets user state | |
| `logout()` clears token and user | |
| Expired token triggers logout | |

### 13. `lib/trip-context.tsx`

| Test | Description |
|---|---|
| `useTripCurrency` returns `default_currency` from context | |
| Falls back to `'USD'` with no context | |

---

## Implementation Order

| # | File | New test file | Effort |
|---|---|---|---|
| 1 | `lib/retry-fetch.ts` | `retry-fetch.test.ts` | Small |
| 2 | `lib/geocode-utils.ts` | `geocode-utils.test.ts` | Small |
| 3 | `lib/destination-day-utils.ts` | `destination-day-utils.test.ts` | Small |
| 4 | `lib/timezone-utils.ts` | Add to existing test | Small |
| 5 | `components/budget/useBudget.ts` | `useBudget.test.ts` | Small |
| 6 | `components/expenses/useExpenseForm.ts` | `useExpenseForm.test.ts` | Medium |
| 7 | `components/transport/useTransport.ts` | `useTransport.test.ts` | Medium |
| 8 | `components/destinations/useDestinations.ts` | `useDestinations.test.ts` | Medium |
| 9 | `components/days/DayHeader.tsx` | `DayHeader.test.tsx` | Medium |
| 10 | `components/days/DayTimeline.tsx` | `DayTimeline.test.tsx` | Medium |
| 11 | `components/expenses/BudgetExceededModal.tsx` | `BudgetExceededModal.test.tsx` | Small |
| 12 | `lib/auth-context.tsx` | `auth-context.test.tsx` | Large |
| 13 | `lib/trip-context.tsx` | `trip-context.test.tsx` | Medium |

Completing steps 1–11 is expected to bring overall statement coverage from ~12% of files to **≥50% of files** and V8 total statements from 83% (on tested files only) to a meaningful **≥65% global** figure.

---

## Running Tests

```bash
# Run all unit tests
cd frontend && npx vitest run

# Run with coverage report
cd frontend && npx vitest run --coverage

# Watch mode during development
cd frontend && npx vitest

# Run a single file
cd frontend && npx vitest run lib/retry-fetch.test.ts
```
