# Exchange Rate System — Data Flow Exploration

> Generated: 2026-03-22

## Overview

The exchange rate system enables multi-currency expense tracking. Users record expenses in any currency; the system converts them to the trip's base currency for unified budget calculations.

---

## 1. Frontend Form Inputs

### ExpenseForm (`frontend/components/expenses/ExpenseForm.tsx`)

- **Currency dropdown** (lines 92–106): 20 common currencies (USD, EUR, GBP, JPY, etc.)
- **Exchange rate field** (lines 107–129): Only visible when expense currency ≠ trip base currency. Label: `"1 {expense_currency} = ? {base_currency}"`. Step size `0.000001` (6 decimal places).
- **Conversion preview** (lines 123–127): Shows `"≈ 108.00 USD"` based on entered amount × rate.

### Auto-fetch logic (lines 37–61)

A `useEffect` fires when the currency dropdown changes:
1. Skips if expense currency == base currency or editing an existing expense.
2. Calls `exchangeApi.getRate(from, to)`.
3. Populates the exchange_rate field on success; falls back silently on failure (user can enter manually).

### Trip currency context (`frontend/lib/trip-context.tsx`)

`useTripCurrency()` hook returns the trip's `default_currency` (or `'USD'`). Used to pre-fill the currency selector and as the target for conversions.

---

## 2. Frontend API Client (`frontend/lib/api.ts`)

```typescript
// Line 228–234
exchangeApi.getRate(from, to)
  → GET /exchange-rates/pair/?from={from}&to={to}
  → Response: { rate: number | null, from: string, to: string }

// Line 169–226
expenseApi.create(data)     → POST /expenses/
expenseApi.update(id, data) → PUT /expenses/{id}
expenseApi.checkBudget(data)→ POST /expenses/check-budget/
```

---

## 3. Backend Endpoints

### Exchange rate router (`app/routers/exchange_rates.py`)

| Endpoint | Method | Params | Response |
|----------|--------|--------|----------|
| `/exchange-rates/` | GET | `base` (default `"USD"`) | `dict[str, float]` — all rates for base |
| `/exchange-rates/pair/` | GET | `from`, `to` (3-letter codes) | `{ rate, from, to }` |

### Expense router (`app/routers/expenses.py`)

**`_resolve_conversion()`** (lines 52–86) is the core conversion dispatcher:
1. Same currency → `(1.0, amount)`
2. User-provided rate → use it
3. Otherwise → call `exchange_rate.convert()`
4. Unavailable → HTTP 422 with message asking user to enter rate manually

This function is called during expense creation, update, and budget-check.

---

## 4. External API

**Source:** Open Exchange Rates (`https://open.er-api.com/v6/latest/{base}`)
- No API key required
- Returns `{ "result": "success", "rates": { "EUR": 0.92, ... } }`
- Called via `httpx` async client

### Caching (`app/services/exchange_rate.py`)

- **In-memory dict** keyed by base currency
- **TTL:** 3600 seconds (1 hour), using `time.monotonic()`
- **Stale fallback:** If the API is unreachable, returns previously cached rates
- `invalidate_cache()` available for testing

---

## 5. Data Models

### Expense model (`app/models/expense.py`, lines 71–125)

| Column | Type | Purpose |
|--------|------|---------|
| `amount` | `Numeric(10,2)` | Original amount in expense currency |
| `currency` | `String(3)` | ISO 4217 code (e.g. `"EUR"`) |
| `exchange_rate` | `Numeric(12,6)` | Rate: 1 expense_currency = X base_currency |
| `base_amount` | `Numeric(10,2)` | Converted amount in trip's base currency |

### Trip model (`app/models/trip.py`, line 41)

| Column | Type | Purpose |
|--------|------|---------|
| `default_currency` | `String(10)` | Trip's base currency for all conversions |

### Pydantic schemas (`app/schemas/expense.py`)

- `ExpenseCreate.exchange_rate`: `float | None` — optional; auto-resolved if omitted
- `Expense.base_amount`: `Decimal | None` — calculated server-side

---

## 6. Budget Calculations (`app/services/budget_service.py`)

`get_budget_status()` aggregates expenses using `COALESCE(base_amount, amount)` — always operates in the trip's base currency. Produces:
- Total spent (sum of converted amounts)
- Category breakdown
- Booked vs estimated split
- Budget status: normal / warning / danger / over
- Alert messages

---

## 7. Frontend Display

| Component | File | What it shows |
|-----------|------|---------------|
| `ExpenseItem` | `frontend/components/expenses/ExpenseItem.tsx` | Base amount first, original amount underneath if different currency |
| `BudgetBreakdown` | `frontend/components/budget/BudgetBreakdown.tsx` | Category breakdown in base currency |
| `BudgetProgress` | `frontend/components/budget/BudgetProgress.tsx` | Progress bar: spent/budget, booked vs estimated |
| `NextTripCard` | `frontend/components/dashboard/NextTripCard.tsx` | Budget used/total on dashboard |

Currency formatting uses `Intl.NumberFormat` via `formatCurrency()` in `frontend/lib/currency-utils.ts`.

---

## 8. End-to-End Flow

```
User selects currency in ExpenseForm
  │
  ▼
useEffect fires → exchangeApi.getRate(EUR, USD)
  │
  ▼
GET /exchange-rates/pair/?from=EUR&to=USD
  │
  ▼
Backend: get_rates("EUR") → Open Exchange Rates API (or cache)
  │
  ▼
Returns rate → auto-fills exchange_rate field
  │
  ▼
User clicks Submit
  │
  ▼
expenseApi.checkBudget(formData) → POST /expenses/check-budget/
  │
  ▼
Backend: _resolve_conversion() → calculates base_amount
  │
  ▼
Returns budget impact → show warning modal if over budget
  │
  ▼
expenseApi.create(formData) → POST /expenses/
  │
  ▼
Backend: stores amount, currency, exchange_rate, base_amount
  │
  ▼
Display: ExpenseItem shows base_amount (trip currency)
         BudgetProgress sums all base_amounts
```

---

## 9. Utilities

- **`convertCurrency()`** (`frontend/lib/currency-utils.ts`): Client-side conversion using USD as intermediary — `(amount / rateFrom) * rateTo`
- **`infer_base_currency(country)`** (`app/services/exchange_rate.py`, lines 80–154): Maps 100+ country names to ISO currency codes; defaults to `"USD"`

---

## 10. Error Handling

| Scenario | Behavior |
|----------|----------|
| API unreachable | Return stale cache; if no cache, return `None` |
| Rate unavailable for pair | HTTP 422 — "Please provide an exchange_rate manually" |
| Frontend auto-fetch fails | User can type rate manually; placeholder says "Fetching rate..." |
| Budget check fails | Alert shown in UI |

---

## 11. Test Coverage

- `tests/test_exchange_rate_service.py` — rate service unit tests
- `tests/test_expense_currency_router.py` — expense endpoint tests with currencies
- `tests/test_budget_multicurrency.py` — budget calculations with mixed currencies
- `tests/test_currency_convert.py` — conversion function tests
- `frontend/e2e/expenses.spec.ts` — E2E expense workflows
