# Multi-Currency Budget Support — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Backend budget service, expense CRUD, frontend display

## Problem

The `currency` field already exists on expenses, but `budget_service.py` ignores it — it sums all `amount` values as if they share a single currency. Users traveling internationally enter expenses in different currencies with no conversion to a common base, making budget tracking meaningless.

## Approach: Conversion at the Edge

Convert expenses to the trip's base currency at entry time and store the converted amount. The budget service continues to sum a single column (`base_amount`), keeping aggregation queries simple. Exchange rates are fetched once at creation time via the existing `exchange_rate.py` service and stored on the expense for auditability.

### Why this approach over alternatives

- **vs. query-time conversion:** Avoids complex joins and per-query rate lookups. Budget calculations stay O(1) per expense.
- **vs. in-memory-only conversion:** Preserves the rate used, enabling audit ("this expense was EUR 50 at 1.08") and the original/converted toggle.

## Data Model Changes

### Trip model — add one field

- `base_currency: String(3)` — the currency the budget is denominated in. Inferred from the first destination's country when creating a trip, overridable by the user. Defaults to `"USD"`.

### Expense model — add two fields

Keep `amount` as-is (the original currency amount). Add:

- `exchange_rate: Numeric(12, 6)` — the rate used at entry time (e.g., 1.08 for EUR to USD). Defaults to `1.0` when expense currency matches trip base currency.
- `base_amount: Numeric(10, 2)` — `amount * exchange_rate`, the converted value in the trip's base currency. This is what the budget service sums.

Convention:
- `amount` = what the user entered, in `currency`
- `base_amount` = converted to trip's `base_currency`
- `exchange_rate` = the multiplier (`base_amount = amount * exchange_rate`)

### Migration

- All existing expenses: `base_amount = amount`, `exchange_rate = 1.0`
- All existing trips: `base_currency = "USD"` (or inferred from first destination if one exists)
- Must be compatible with both SQLite (local) and Postgres (production)

## Currency Service

The existing `app/services/exchange_rate.py` already handles rate fetching with 1-hour caching and stale fallback. Add a thin helper:

- `convert(amount: Decimal, from_currency: str, to_currency: str) -> tuple[Decimal, Decimal] | None` — returns `(exchange_rate, base_amount)` or `None` if rates unavailable

### Base currency inference

- `infer_base_currency(destinations) -> str` — maps first destination's country to currency code via a static lookup (or `pycountry`). Falls back to `"USD"`.
- Called when a trip is created or when the first destination is added.

### New API endpoint

- `GET /exchange-rate/?from=EUR&to=USD` — returns the current rate for frontend pre-fill. Returns `null` if unavailable.

## Budget Service Changes

Minimal changes — the core of Approach 1:

### `get_budget_status()`

- Sum `base_amount` instead of `amount` in the category aggregation query
- Include `base_currency` in the `BudgetStatusResponse`

### `check_expense_impact()`

- Sum `base_amount` instead of `amount` for current total
- Incoming expense amount must already be converted to base currency before calling

### `_generate_alerts()`

- Use `base_currency` for currency symbol in alert messages instead of hardcoded `$`

### Schema changes

- `BudgetStatusResponse` — add `base_currency: str`
- `BudgetImpactResponse` — add `base_currency: str`
- `CategoryBudget` — no structural change; `spent`, `booked`, `estimated` now explicitly refer to base currency amounts

## Expense Creation Flow

Conversion logic sits between schema validation and model persistence in the router.

### Create

1. Frontend sends `{ amount, currency, exchange_rate? }`
2. Router fetches the trip to get `base_currency`
3. If `currency == base_currency` -> `exchange_rate = 1.0`, `base_amount = amount`
4. Else if `exchange_rate` provided by user -> `base_amount = amount * exchange_rate`
5. Else -> call `exchange_rate.get_rates(base_currency)`, compute `base_amount`
6. Inject `exchange_rate` and `base_amount` into the dict before `models.Expense(**data)`

### Update

1. If `amount` or `currency` changed -> recalculate `base_amount` using stored or new rate
2. If only `exchange_rate` changed -> recalculate `base_amount` from existing `amount`
3. Otherwise -> leave `base_amount` untouched

### Budget check

Convert proposed expense to `base_amount` first, then pass to `check_expense_impact`.

### Schema changes

- `ExpenseCreate` — add optional `exchange_rate: float | None = None`
- `ExpenseUpdate` — add optional `exchange_rate: float | None = None`
- `Expense` (response) — add `exchange_rate: float`, `base_amount: Decimal`

## Frontend Changes

### Display toggle

A toggle component on expense lists and budget views switching between:
- **Original currency** — `amount` + `currency` (e.g., "EUR 50.00")
- **Base currency** — `base_amount` + trip `base_currency` (e.g., "$54.00")

Default view: base currency.

### Expense form

1. Currency dropdown (defaults to trip's `base_currency`)
2. If currency differs from base: rate field appears, pre-filled from `GET /exchange-rate/`
3. User can accept or tweak the rate
4. Live preview: "EUR 50.00 ~ $54.00"
5. If rate API unavailable: empty field, user enters manually

### Budget components

- `BudgetProgress`, `BudgetBreakdown` — use `base_currency` from response for currency symbol (no more hardcoded `$`)
- `BudgetExceededModal` — same treatment

### Types

- Add `exchange_rate`, `base_amount` to `Expense` type
- Add `base_currency` to `Trip`, `BudgetStatusResponse`, `BudgetImpactResponse`

### API client

- Add `exchangeApi.getRates(baseCurrency)` -> `GET /exchange-rate/?base=USD`

## Error Handling & Edge Cases

### Rate API unavailable

- Backend returns `exchange_rate: null` in suggestion response
- Frontend shows empty rate field with hint: "Enter exchange rate manually"
- Expense creation still works with user-provided rate

### Trip has no base currency

- Falls back to `"USD"`
- If user later sets a base currency, existing expenses keep their stored `base_amount`

### User changes trip base currency

- Confirmation prompt warns about recalculation
- `POST /trips/{trip_id}/rebase-currency/` batch-recalculates all expenses
- For each expense: fetch rate from `currency -> new_base_currency`, update `exchange_rate` and `base_amount`
- If rate unavailable for any expense: flag for manual review, don't silently skip

### Same currency

- `exchange_rate = 1.0`, `base_amount = amount` — no API call, no extra UI

### Precision

- Rates: `Numeric(12, 6)` — six decimal places (standard FX precision)
- `base_amount`: computed server-side with `Decimal` arithmetic, never floating point
- Frontend: displays at 2 decimal places

## Testing

- Unit tests for `convert()` helper — normal case, same currency, API failure
- Unit tests for updated `get_budget_status()` — mixed currencies sum correctly
- Unit tests for expense creation — rate injection, manual override, fallback
- Unit tests for rebase-currency — batch recalculation, partial failure handling
- Integration test: create expenses in multiple currencies, verify budget status sums base amounts
- Frontend: toggle switches display correctly, form shows/hides rate field
