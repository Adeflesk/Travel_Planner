# Trip Default Currency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `default_currency` to the Trip model and propagate it as a pre-fill default throughout all cost-entry forms.

**Architecture:** Add a dedicated `default_currency` column to the `trips` table; expose it through the Pydantic schemas; thread it into the React `TripProvider` context so any child component can call `useTripCurrency()` to pre-fill currency fields without duplicating logic. The existing `context.budget_currency` value is migrated to the new column and kept in sync for backwards compat.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy (SQLite/Postgres), Pydantic v2, Next.js 14 App Router, TypeScript, React Context API.

---

## Task 1: Backend model — add `default_currency` column

**Files:**
- Modify: `app/models/trip.py`

**Step 1: Add the column to the SQLAlchemy model**

In `app/models/trip.py`, add after the `context` column (line 40):

```python
default_currency = Column(String(10), nullable=True)
```

Full import block already has `String` — no new imports needed.

**Step 2: Run tests to make sure nothing broke**

```bash
source .venv/bin/activate
pytest -q tests/ 2>&1 | tail -20
```

Expected: all existing tests pass (the column is nullable, so no existing row breaks).

**Step 3: Commit**

```bash
git add app/models/trip.py
git commit -m "feat: add default_currency column to Trip model"
```

---

## Task 2: Backend schemas — expose `default_currency`

**Files:**
- Modify: `app/schemas/trip.py`

**Step 1: Write the failing test**

In `tests/test_expenses_router.py` — or create `tests/test_trip_default_currency.py`:

```python
from datetime import date
from app import models

def test_trip_default_currency_in_response(client, test_user, db_session):
    trip = models.Trip(
        name="Currency Trip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 5),
        status="planning",
        user_id=test_user["user"].id,
        default_currency="EUR",
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    resp = client.get(f"/trips/{trip.id}")
    assert resp.status_code == 200
    assert resp.json()["default_currency"] == "EUR"


def test_trip_create_with_default_currency(client, test_user):
    payload = {
        "name": "EUR Trip",
        "start_date": "2030-03-01",
        "end_date": "2030-03-10",
        "default_currency": "EUR",
    }
    resp = client.post("/trips/", json=payload)
    assert resp.status_code == 201
    assert resp.json()["default_currency"] == "EUR"


def test_trip_update_default_currency(client, test_user, db_session):
    trip = models.Trip(
        name="Update Currency",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 5),
        status="planning",
        user_id=test_user["user"].id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    resp = client.patch(f"/trips/{trip.id}", json={"default_currency": "GBP"})
    assert resp.status_code == 200
    assert resp.json()["default_currency"] == "GBP"
```

**Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_trip_default_currency.py -v
```

Expected: FAIL — `default_currency` not in schema yet.

**Step 3: Add field to `TripBase` and `TripUpdate` in `app/schemas/trip.py`**

In `TripBase` (after `context: Optional[dict[str, Any]] = None` at line 32):

```python
default_currency: Optional[str] = None
```

In `TripUpdate` (after `context: Optional[dict[str, Any]] = None` at line 92):

```python
default_currency: Optional[str] = None
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/test_trip_default_currency.py -v
```

Expected: PASS all 3 tests.

**Step 5: Commit**

```bash
git add app/schemas/trip.py tests/test_trip_default_currency.py
git commit -m "feat: expose default_currency in Trip schemas and add tests"
```

---

## Task 3: Database migration

**Files:**
- Create: `migrations/add_default_currency_to_trips.py`

**Step 1: Write the migration script**

```python
#!/usr/bin/env python
"""
Migration: Add default_currency column to trips table.

Backfills from context->budget_currency for existing rows.
Safe to run multiple times (checks column existence first).
"""
import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import text, inspect  # noqa: E402


def _get_engine():
    from database import engine
    return engine


def upgrade():
    engine = _get_engine()
    dialect = engine.dialect.name  # "sqlite" or "postgresql"

    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("trips")]

        if "default_currency" not in columns:
            conn.execute(text("ALTER TABLE trips ADD COLUMN default_currency VARCHAR(10)"))
            conn.commit()
            print("Added default_currency column to trips.")
        else:
            print("Column default_currency already exists — skipping.")

        # Backfill from context JSON blob for SQLite
        if dialect == "sqlite":
            conn.execute(text("""
                UPDATE trips
                SET default_currency = json_extract(context, '$.budget_currency')
                WHERE default_currency IS NULL
                  AND context IS NOT NULL
                  AND json_extract(context, '$.budget_currency') IS NOT NULL
            """))
        else:
            # PostgreSQL: context is a jsonb column
            conn.execute(text("""
                UPDATE trips
                SET default_currency = context->>'budget_currency'
                WHERE default_currency IS NULL
                  AND context IS NOT NULL
                  AND context->>'budget_currency' IS NOT NULL
            """))
        conn.commit()
        print("Backfilled default_currency from context.budget_currency.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
```

**Step 2: Run the migration against the dev database**

```bash
source .venv/bin/activate
python migrations/add_default_currency_to_trips.py
```

Expected output:
```
Added default_currency column to trips.
Backfilled default_currency from context.budget_currency.
Migration complete.
```

**Step 3: Verify the migration ran**

```bash
sqlite3 travel_planner.db "SELECT id, name, default_currency FROM trips LIMIT 5;"
```

**Step 4: Register migration in `migrate.py`**

Open `migrate.py` and look at how existing migrations are registered (it likely has an array of migration files to run). Add `"migrations/add_default_currency_to_trips.py"` to the list.

**Step 5: Run full backend test suite**

```bash
pytest -q tests/ 2>&1 | tail -20
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add migrations/add_default_currency_to_trips.py migrate.py
git commit -m "feat: add migration for default_currency column with context backfill"
```

---

## Task 4: Frontend types — add `default_currency` to Trip

**Files:**
- Modify: `frontend/lib/types.ts`

**Step 1: Find the `Trip` interface**

```bash
grep -n "interface Trip" frontend/lib/types.ts
```

**Step 2: Add `default_currency` field**

In `frontend/lib/types.ts`, find the `Trip` interface (the one with `id`, `name`, `start_date`, etc.) and add:

```typescript
default_currency?: string;
```

Place it near the other budget-related fields (`budget`, `budget_currency`, etc.).

**Step 3: Lint and type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/lib/types.ts
git commit -m "feat: add default_currency to frontend Trip type"
```

---

## Task 5: React context — expose `useTripCurrency()`

**Files:**
- Modify: `frontend/lib/trip-context.tsx`

**Step 1: Add `defaultCurrency` to `TripContextValue`**

In `frontend/lib/trip-context.tsx`, update the `TripContextValue` interface:

```typescript
interface TripContextValue {
  tripId: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  tripContext?: TripContext | null;
  defaultCurrency: string;  // <-- add this
}
```

**Step 2: Update `TripProvider` to compute `defaultCurrency`**

The provider receives `trip.default_currency` (new column) or falls back to `tripContext.budget_currency`, then 'USD'.

Update the `TripProviderProps` interface:

```typescript
interface TripProviderProps {
  tripId: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  tripContext?: TripContext | null;
  defaultCurrency?: string;   // <-- add this
  children: ReactNode;
}
```

Update `TripProvider` function signature and the Provider value:

```typescript
export function TripProvider({
  tripId,
  startDate,
  endDate,
  timezone,
  tripContext,
  defaultCurrency,
  children,
}: TripProviderProps) {
  const resolvedCurrency =
    defaultCurrency ?? tripContext?.budget_currency ?? 'USD';

  return (
    <TripContextCtx.Provider
      value={{ tripId, startDate, endDate, timezone, tripContext, defaultCurrency: resolvedCurrency }}
    >
      {children}
    </TripContextCtx.Provider>
  );
}
```

**Step 3: Export `useTripCurrency()` helper**

At the bottom of `frontend/lib/trip-context.tsx`, add:

```typescript
/**
 * Returns the trip's default currency for pre-filling cost forms.
 * Falls back to 'USD' when used outside a TripProvider.
 */
export function useTripCurrency(): string {
  const ctx = useContext(TripContextCtx);
  return ctx?.defaultCurrency ?? 'USD';
}
```

**Step 4: Lint and type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (possibly errors in callers — fix those in Tasks 6–8).

**Step 5: Commit**

```bash
git add frontend/lib/trip-context.tsx
git commit -m "feat: add defaultCurrency to TripProvider context and export useTripCurrency hook"
```

---

## Task 6: Thread `default_currency` into the TripProvider

**Files:**
- Modify: `frontend/app/trips/[id]/page.tsx`

**Step 1: Pass `default_currency` to `TripProvider`**

In `frontend/app/trips/[id]/page.tsx`, find the `<TripProvider ...>` JSX (around line 117) and add the prop:

```tsx
<TripProvider
  tripId={tripId}
  startDate={trip.start_date}
  endDate={trip.end_date}
  timezone={trip.timezone}
  tripContext={trip.context}
  defaultCurrency={trip.default_currency}   // <-- add this
>
```

**Step 2: Lint and type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/app/trips/[id]/page.tsx
git commit -m "feat: pass default_currency from trip into TripProvider"
```

---

## Task 7: Pre-fill TransportForm and TransportOptionForm

**Files:**
- Modify: `frontend/components/transport/TransportForm.tsx`
- Modify: `frontend/components/transport/TransportOptionForm.tsx`

**Step 1: Update `TransportForm.tsx`**

Add the import at the top:

```typescript
import { useTripCurrency } from '@/lib/trip-context';
```

Inside the `TransportForm` component function, before the state declarations, add:

```typescript
const tripCurrency = useTripCurrency();
```

Change line 56 from:

```typescript
const [currency, setCurrency] = useState(initialData?.currency ?? 'USD');
```

to:

```typescript
const [currency, setCurrency] = useState(initialData?.currency ?? tripCurrency);
```

**Step 2: Update `TransportOptionForm.tsx`**

Add the import at the top:

```typescript
import { useTripCurrency } from '@/lib/trip-context';
```

Inside the `TransportOptionForm` component function, before state declarations, add:

```typescript
const tripCurrency = useTripCurrency();
```

Change line 18 from:

```typescript
const [currency, setCurrency] = useState(initialData?.currency ?? 'USD');
```

to:

```typescript
const [currency, setCurrency] = useState(initialData?.currency ?? tripCurrency);
```

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/components/transport/TransportForm.tsx frontend/components/transport/TransportOptionForm.tsx
git commit -m "feat: pre-fill currency in TransportForm and TransportOptionForm from trip default"
```

---

## Task 8: Pre-fill expense form currency default

**Files:**
- Modify: `frontend/components/expenses/useExpenseForm.ts`

The `useExpenseForm` hook calls `getInitialFormData(tripId)` which hardcodes `currency: 'USD'`. We need to pass the trip currency in.

**Step 1: Update the hook signature**

In `frontend/components/expenses/useExpenseForm.ts`:

Change `getInitialFormData` to accept a currency:

```typescript
const getInitialFormData = (tripId: number, currency: string): ExpenseFormData => ({
  trip_id: tripId,
  category: '',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
  currency,
  booked: false,
  paid: false,
  cancel_by_date: '',
});
```

Add the import:

```typescript
import { useTripCurrency } from '@/lib/trip-context';
```

Update `useExpenseForm` signature:

```typescript
export function useExpenseForm(tripId: number, onSuccess: () => void) {
  const tripCurrency = useTripCurrency();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(
    getInitialFormData(tripId, tripCurrency)
  );
```

Update the two places that call `getInitialFormData(tripId)` → `getInitialFormData(tripId, tripCurrency)`:
- Line 41: `setFormData(getInitialFormData(tripId));` → `setFormData(getInitialFormData(tripId, tripCurrency));`
- Line 53: same change
- Line 82 (in `resetForm`): same change

**Step 2: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/components/expenses/useExpenseForm.ts
git commit -m "feat: pre-fill expense currency from trip default currency"
```

---

## Task 9: Fix BudgetProgress hardcoded USD

**Files:**
- Modify: `frontend/components/budget/BudgetProgress.tsx`

**Step 1: Add `currency` prop**

In `frontend/components/budget/BudgetProgress.tsx`, update the `BudgetProgressProps` interface:

```typescript
interface BudgetProgressProps {
  totalBudget: number | null;
  totalSpent: number;
  percentageUsed: number;
  remaining: number;
  status: BudgetStatus;
  bookedAmount?: number;
  estimatedAmount?: number;
  showDetails?: boolean;
  currency?: string;  // <-- add this
}
```

Update the destructured props in the function signature:

```typescript
export function BudgetProgress({
  ...existing props...
  currency = 'USD',
}: BudgetProgressProps) {
```

Update the `formatCurrency` function to use the prop:

```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

**Step 2: Find all callers of `BudgetProgress` and pass currency**

```bash
grep -rn "BudgetProgress" frontend/ --include="*.tsx"
```

For each caller, check if the surrounding component has access to `useTripCurrency()`. If it does, add `currency={tripCurrency}` prop. If not, add the hook call first.

**Step 3: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/components/budget/BudgetProgress.tsx
git commit -m "feat: accept currency prop in BudgetProgress (was hardcoded USD)"
```

---

## Task 10: Wire currency into TripWizard and TripSettings submit

**Files:**
- Modify: `frontend/components/trips/TripWizard.tsx`
- Modify: `frontend/components/trips/TripSettings.tsx`

### TripWizard

The wizard collects `budget_currency` in Step 5. On submit it writes it to `context.budget_currency`. We also need it sent as `default_currency` at the trip root.

**Step 1: Update `TripWizardProps.onSubmit` signature**

In `frontend/components/trips/TripWizard.tsx`, update the `onSubmit` type:

```typescript
interface TripWizardProps {
    onSubmit: (data: {
        name: string;
        description?: string;
        timezone?: string;
        start_date: string;
        end_date: string;
        budget?: number;
        default_currency?: string;  // <-- add
        context: TripContext;
    }) => void;
    ...
}
```

**Step 2: Pass `default_currency` in `handleSubmit`**

In the `handleSubmit` function (around line 82), add `default_currency` to the `onSubmit` call:

```typescript
onSubmit({
    name: data.name,
    description: data.description.trim() || undefined,
    timezone: data.timezone || undefined,
    start_date: data.start_date,
    end_date: data.end_date,
    budget: data.budget ? parseFloat(data.budget) : undefined,
    default_currency: data.budget_currency || undefined,  // <-- add
    context,
});
```

**Step 3: Find the TripWizard caller and update it**

```bash
grep -rn "TripWizard" frontend/ --include="*.tsx"
```

In the caller, update the `onSubmit` handler to include `default_currency` in the API call:

```typescript
// Before:
await tripApi.create({ name, start_date, end_date, budget, context });

// After:
await tripApi.create({ name, start_date, end_date, budget, default_currency, context });
```

### TripSettings

TripSettings currently saves only `context`. It should also update `default_currency` on the trip when `budget_currency` changes.

**Step 4: Update TripSettings to also save `default_currency`**

In `frontend/components/trips/TripSettings.tsx`, update `TripSettingsProps`:

```typescript
interface TripSettingsProps {
    tripId: number;
    context: TripContext | null;
    onSave: (context: TripContext, defaultCurrency: string) => Promise<void>;
    onClose: () => void;
}
```

Update `handleSubmit`:

```typescript
const handleSubmit = async () => {
    setLoading(true);
    try {
        await onSave(data, data.budget_currency);
        onClose();
    } catch (e) {
        console.error(e);
        alert('Failed to save trip settings.');
    } finally {
        setLoading(false);
    }
};
```

**Step 5: Update the `handleSaveSettings` caller in `frontend/app/trips/[id]/page.tsx`**

```typescript
const handleSaveSettings = async (context: TripContext, defaultCurrency: string) => {
    try {
        await tripApi.update(tripId, { context, default_currency: defaultCurrency });
        const response = await tripApi.getById(tripId);
        setTrip(response.data);
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
};
```

**Step 6: Lint and type-check**

```bash
cd frontend && npm run lint && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 7: Commit**

```bash
git add frontend/components/trips/TripWizard.tsx frontend/components/trips/TripSettings.tsx frontend/app/trips/[id]/page.tsx
git commit -m "feat: persist default_currency from wizard and settings to trip model"
```

---

## Task 11: Manual smoke test

**Step 1: Start both servers**

```bash
# Terminal 1
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

**Step 2: Create a new trip**

- Navigate to http://localhost:3000
- Create a new trip with budget currency set to `EUR`
- Confirm the trip API response has `"default_currency": "EUR"`

```bash
curl -s http://localhost:8000/trips/<id> | python3 -m json.tool | grep currency
```

**Step 3: Open the trip and add transport**

- Go to a day view and click Transport
- Confirm the currency field pre-fills with `EUR` (not `USD`)

**Step 4: Add an expense**

- Go to Expenses tab
- Confirm the currency field pre-fills with `EUR`

**Step 5: Change currency via Trip Settings**

- Open Trip Context settings
- Change `budget_currency` to `GBP`
- Save
- Open a Transport form again — confirm it now pre-fills `GBP`

---

## Task 12: Run full test suite

**Step 1:**

```bash
source .venv/bin/activate
pytest -q tests/ 2>&1 | tail -20
```

Expected: all tests pass.

**Step 2: Lint**

```bash
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Final commit (if any stragglers)**

```bash
git add -p  # review and add any remaining changes
git commit -m "chore: final cleanup for trip default currency feature"
```
