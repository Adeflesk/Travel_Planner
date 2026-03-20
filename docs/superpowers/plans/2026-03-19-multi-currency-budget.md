# Multi-Currency Budget Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert expenses to a trip's base currency at entry time so the budget service can accurately sum expenses across multiple currencies.

**Architecture:** Add `exchange_rate` and `base_amount` columns to the Expense model. Conversion happens in the expense router between validation and persistence. The budget service sums `base_amount` instead of `amount`. A new `convert()` helper wraps the existing `exchange_rate.py` service. Frontend gains a currency-aware expense form with rate auto-fetch, and an original/converted display toggle.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy, Pydantic, Next.js 14, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-multi-currency-budget-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `migrations/add_expense_currency_fields.py` | Add columns + backfill |
| Modify | `app/core/migrations.py:284-287` | Register new columns in `expense_columns` list |
| Modify | `app/core/migrations.py:375-403` | Update `trip_summary` view to use `base_amount` |
| Modify | `app/models/expense.py:84-90` | Add `exchange_rate`, `base_amount` columns |
| Modify | `app/schemas/expense.py` | Add fields to `ExpenseCreate`, `ExpenseUpdate`, `Expense` |
| Modify | `app/schemas/budget.py` | Add `base_currency` to `BudgetStatusResponse`, `BudgetImpactResponse` |
| Modify | `app/services/exchange_rate.py` | Add `convert()` helper |
| Modify | `app/services/budget_service.py` | Sum `base_amount`, pass `base_currency` to alerts |
| Modify | `app/routers/expenses.py` | Inject conversion logic in create/update/check-budget |
| Modify | `app/routers/exchange_rates.py` | Add `GET /exchange-rate/` pair endpoint |
| Modify | `app/routers/__init__.py` | No change needed (router already exported) |
| Create | `tests/test_currency_convert.py` | Tests for `convert()` helper |
| Create | `tests/test_budget_multicurrency.py` | Tests for budget service with mixed currencies |
| Create | `tests/test_expense_currency_router.py` | Tests for expense create/update with conversion |
| Modify | `frontend/lib/types.ts` | Add `exchange_rate`, `base_amount`, `base_currency` fields |
| Modify | `frontend/lib/api.ts` | Add `exchangeApi.getRate()` |
| Modify | `frontend/components/expenses/ExpenseForm.tsx` | Currency dropdown + rate field + auto-fetch |
| Modify | `frontend/components/expenses/useExpenseForm.ts` | Pass `baseCurrency` to form |
| Modify | `frontend/components/expenses/ExpenseList.tsx:48-54` | Pass `baseCurrency` prop |
| Modify | `frontend/components/budget/BudgetCard.tsx` | Use `base_currency` from response |
| Modify | `frontend/components/budget/BudgetProgress.tsx` | Use `base_currency` from response |
| Modify | `frontend/components/expenses/BudgetExceededModal.tsx` | Use `base_currency` for formatting |
| Modify | `app/services/exchange_rate.py` | Add `infer_base_currency()` helper |
| Create | `tests/test_infer_currency.py` | Tests for base currency inference |
| Modify | `app/routers/destinations.py:55-75` | Wire `infer_base_currency` into first destination creation |
| Create | `frontend/components/expenses/CurrencyToggle.tsx` | Toggle between original/base currency display |
| Modify | `frontend/components/expenses/ExpenseItem.tsx` | Support currency toggle |
| Modify | `app/schemas/budget.py` | Add `RebaseCurrencyRequest` schema (re-exported via `__init__.py`) |

---

### Task 1: Database Migration — Add `exchange_rate` and `base_amount` to Expenses

**Files:**
- Create: `migrations/add_expense_currency_fields.py`
- Modify: `app/core/migrations.py:284-287`
- Modify: `app/core/migrations.py:386-387`

- [ ] **Step 1: Write the standalone migration script**

Create `migrations/add_expense_currency_fields.py`:

```python
#!/usr/bin/env python
"""
Migration: Add exchange_rate and base_amount columns to expenses table.

Backfills existing rows with exchange_rate=1.0 and base_amount=amount
(assumes all existing expenses are in the trip's base currency).
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

    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("expenses")]

        if "exchange_rate" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN exchange_rate NUMERIC(12, 6) DEFAULT 1.0"
                )
            )
            conn.commit()
            print("Added exchange_rate column to expenses.")
        else:
            print("Column exchange_rate already exists — skipping.")

        if "base_amount" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN base_amount NUMERIC(10, 2)"
                )
            )
            conn.commit()
            print("Added base_amount column to expenses.")
        else:
            print("Column base_amount already exists — skipping.")

        # Backfill: set base_amount = amount for all existing rows where null
        conn.execute(
            text(
                """
                UPDATE expenses
                SET base_amount = amount,
                    exchange_rate = 1.0
                WHERE base_amount IS NULL
            """
            )
        )
        conn.commit()
        print("Backfilled base_amount = amount for existing expenses.")


if __name__ == "__main__":
    upgrade()
    print("Migration complete.")
```

- [ ] **Step 2: Register columns in `app/core/migrations.py`**

The `run_migrations()` function uses a hardcoded list. In `app/core/migrations.py`, update the `expense_columns` list (line 284-287) to include the new columns:

```python
    expense_columns = [
        ("transport_id", "INTEGER", "NULL"),
        ("accommodation_id", "INTEGER", "NULL"),
        ("exchange_rate", "NUMERIC(12, 6)", "1.0"),
        ("base_amount", "NUMERIC(10, 2)", "NULL"),
    ]
```

- [ ] **Step 3: Update `trip_summary` view to use `base_amount`**

In `app/core/migrations.py`, update `create_trip_summary_view()` (lines 386-387). Change `SUM(e.amount)` to `SUM(COALESCE(e.base_amount, e.amount))` in both places:

```python
    view_sql = """
        CREATE VIEW trip_summary AS
        SELECT
            t.id,
            t.name,
            t.start_date,
            t.end_date,
            t.budget,
            COUNT(DISTINCT td.id)             AS day_count,
            COALESCE(SUM(COALESCE(e.base_amount, e.amount)), 0) AS total_spent,
            t.budget - COALESCE(SUM(COALESCE(e.base_amount, e.amount)), 0) AS budget_remaining
        FROM trips t
        LEFT JOIN trip_days td  ON td.trip_id = t.id
        LEFT JOIN expenses e    ON e.trip_id = t.id
        GROUP BY t.id;
    """
```

- [ ] **Step 4: Run the standalone migration locally**

```bash
source .venv/bin/activate
python migrations/add_expense_currency_fields.py
```

Expected: prints "Added exchange_rate column", "Added base_amount column", "Backfilled base_amount".

- [ ] **Step 5: Verify the migration is idempotent**

```bash
python migrations/add_expense_currency_fields.py
```

Expected: prints "already exists — skipping" for both columns.

- [ ] **Step 6: Commit**

```bash
git add migrations/add_expense_currency_fields.py app/core/migrations.py
git commit -m "feat: add exchange_rate and base_amount columns to expenses table"
```

---

### Task 2: Expense Model — Add New Columns

**Files:**
- Modify: `app/models/expense.py:84-90`

- [ ] **Step 1: Add columns to the Expense model**

In `app/models/expense.py`, add two columns after line 85 (`currency = Column(String(3), default="USD")`):

```python
    exchange_rate = Column(Numeric(12, 6), default=1.0, nullable=False, server_default="1.0")
    base_amount = Column(Numeric(10, 2), nullable=True)
```

No new imports needed — `Numeric` is already imported.

- [ ] **Step 2: Verify the model loads**

```bash
source .venv/bin/activate
python -c "from app.models.expense import Expense; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add app/models/expense.py
git commit -m "feat: add exchange_rate and base_amount columns to Expense model"
```

---

### Task 3: Expense Schemas — Add Currency Fields

**Files:**
- Modify: `app/schemas/expense.py`

- [ ] **Step 1: Add `exchange_rate` to `ExpenseCreate`**

After `activity_id` (line 25):

```python
    exchange_rate: float | None = None
```

- [ ] **Step 2: Add `exchange_rate` to `ExpenseUpdate`**

After `currency` (line 33):

```python
    exchange_rate: float | None = None
```

- [ ] **Step 3: Add fields to `Expense` response**

After `activity_id` (line 43):

```python
    exchange_rate: float = 1.0
    base_amount: Decimal | None = None
```

- [ ] **Step 4: Verify schemas load**

```bash
source .venv/bin/activate
python -c "from app.schemas.expense import ExpenseCreate, ExpenseUpdate, Expense; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
git add app/schemas/expense.py
git commit -m "feat: add exchange_rate and base_amount to expense schemas"
```

---

### Task 4: Budget Schemas — Add `base_currency`

**Files:**
- Modify: `app/schemas/budget.py`

- [ ] **Step 1: Add `base_currency` to `BudgetStatusResponse`**

After `danger_threshold` (line 52):

```python
    base_currency: str = "USD"
```

- [ ] **Step 2: Add `base_currency` to `BudgetImpactResponse`**

After `percentage` (line 64):

```python
    base_currency: str = "USD"
```

- [ ] **Step 3: Add `RebaseCurrencyRequest` schema**

After `BudgetImpactResponse`, add:

```python
class RebaseCurrencyRequest(BaseModel):
    new_currency: str

    @field_validator("new_currency")
    @classmethod
    def validate_currency_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError("new_currency must be a 3-letter ISO currency code")
        return v
```

Add `field_validator` to the pydantic import at the top of the file:

```python
from pydantic import BaseModel, field_validator
```

- [ ] **Step 4: Verify schemas load**

```bash
source .venv/bin/activate
python -c "from app.schemas.budget import BudgetStatusResponse, BudgetImpactResponse, RebaseCurrencyRequest; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
git add app/schemas/budget.py
git commit -m "feat: add base_currency to budget response schemas and RebaseCurrencyRequest"
```

---

### Task 5: Currency Convert Helper — TDD

**Files:**
- Modify: `app/services/exchange_rate.py`
- Create: `tests/test_currency_convert.py`

- [ ] **Step 1: Write failing tests for `convert()`**

Create `tests/test_currency_convert.py`:

```python
"""
tests/test_currency_convert.py

Tests for the convert() helper in exchange_rate service.
"""
from decimal import Decimal
from unittest.mock import patch, Mock

from app.services.exchange_rate import convert, invalidate_cache


def _mock_rates(rates: dict[str, float]) -> Mock:
    resp = Mock()
    resp.status_code = 200
    resp.json.return_value = {"result": "success", "rates": rates}
    return resp


def test_convert_normal_case():
    """EUR 50 -> USD at rate 1.08 = 54.00 USD."""
    invalidate_cache()
    mock_resp = _mock_rates({"USD": 1.08, "GBP": 0.86})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is not None
    rate, base_amount = result
    assert float(rate) == 1.08
    assert base_amount == Decimal("54.00")


def test_convert_same_currency():
    """Same currency returns rate 1.0, same amount — no API call."""
    invalidate_cache()
    with patch("app.services.exchange_rate.httpx.get") as mock_get:
        result = convert(Decimal("100"), "USD", "USD")
        mock_get.assert_not_called()

    assert result is not None
    rate, base_amount = result
    assert rate == Decimal("1.0")
    assert base_amount == Decimal("100")


def test_convert_api_failure_returns_none():
    """If rates are unavailable, convert returns None."""
    invalidate_cache()
    import httpx

    with patch(
        "app.services.exchange_rate.httpx.get",
        side_effect=httpx.RequestError("timeout"),
    ):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is None


def test_convert_target_currency_not_in_rates():
    """If target currency isn't in the rates dict, return None."""
    invalidate_cache()
    mock_resp = _mock_rates({"GBP": 0.86})  # no USD

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("50"), "EUR", "USD")

    assert result is None


def test_convert_rounds_to_two_decimals():
    """base_amount is quantized to 2 decimal places."""
    invalidate_cache()
    mock_resp = _mock_rates({"USD": 1.12345})

    with patch("app.services.exchange_rate.httpx.get", return_value=mock_resp):
        result = convert(Decimal("100"), "EUR", "USD")

    assert result is not None
    _, base_amount = result
    # 100 * 1.12345 = 112.345 → rounds to 112.35
    assert base_amount == Decimal("112.35")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_currency_convert.py -v
```

Expected: FAIL — `ImportError: cannot import name 'convert'`

- [ ] **Step 3: Implement `convert()` in `exchange_rate.py`**

Add at the end of `app/services/exchange_rate.py`:

```python
def convert(
    amount: "Decimal", from_currency: str, to_currency: str
) -> tuple["Decimal", "Decimal"] | None:
    """
    Convert *amount* from one currency to another.

    Returns ``(exchange_rate, base_amount)`` or ``None`` if rates are
    unavailable.  ``base_amount`` is quantized to 2 decimal places.
    """
    from decimal import Decimal, ROUND_HALF_UP

    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()

    if from_currency == to_currency:
        return Decimal("1.0"), amount

    rates = get_rates(from_currency)
    if rates is None:
        return None

    rate_float = rates.get(to_currency)
    if rate_float is None:
        return None

    rate = Decimal(str(rate_float))
    base_amount = (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return rate, base_amount
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_currency_convert.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/exchange_rate.py tests/test_currency_convert.py
git commit -m "feat: add convert() helper to exchange rate service with tests"
```

---

### Task 6: Budget Service — Sum `base_amount` Instead of `amount` — TDD

**Files:**
- Modify: `app/services/budget_service.py`
- Create: `tests/test_budget_multicurrency.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_budget_multicurrency.py`. Note: tests use the `test_user` fixture indirectly through `db_session` + `db_setup` which cleans tables. Create a user explicitly within each test to avoid FK issues:

```python
"""
tests/test_budget_multicurrency.py

Tests that budget calculations use base_amount for multi-currency support.
"""
from datetime import date
from decimal import Decimal

from app import models
from app.services.budget_service import get_budget_status, check_expense_impact


def _create_user(db):
    """Create a test user and return its ID."""
    user = models.User(
        email="budget_test@example.com",
        hashed_password="x",
        full_name="Budget Tester",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def test_budget_status_sums_base_amount(db_session):
    """Budget totals should use base_amount, not amount."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Multi-currency trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("1000.00"),
        default_currency="USD",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    # EUR expense: 50 EUR at rate 1.08 = 54.00 USD base_amount
    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
        booked=True,
    )
    # USD expense: 100 USD at rate 1.0 = 100.00 USD base_amount
    e2 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("100.00"),
        currency="USD",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("100.00"),
        date=date.today(),
        booked=False,
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    # Total should be 54 + 100 = 154 (base_amount), NOT 50 + 100 = 150 (amount)
    assert result.total_spent == Decimal("154.00")
    assert result.base_currency == "USD"


def test_budget_status_returns_base_currency(db_session):
    """BudgetStatusResponse includes the trip's base currency."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="EUR trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("500.00"),
        default_currency="EUR",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    assert result.base_currency == "EUR"


def test_budget_status_falls_back_to_usd(db_session):
    """If trip has no default_currency, fall back to USD."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="No currency trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("500.00"),
        default_currency=None,
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    assert result.base_currency == "USD"


def test_check_expense_impact_uses_base_amount(db_session):
    """check_expense_impact should sum base_amount, not amount."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Impact test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("200.00"),
        default_currency="USD",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
    )
    db_session.add(e1)
    db_session.commit()

    # 54 + 150 = 204 > 200 budget → would_exceed
    impact = check_expense_impact(trip.id, Decimal("150.00"), db_session)
    assert impact is not None
    assert impact["would_exceed"] is True


def test_alerts_use_currency_code_not_symbol(db_session):
    """Alert messages use ISO codes like '10.00 EUR', not '$'."""
    user_id = _create_user(db_session)
    trip = models.Trip(
        name="Alert test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("100.00"),
        default_currency="EUR",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("110.00"),
        currency="EUR",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("110.00"),
        date=date.today(),
    )
    db_session.add(e1)
    db_session.commit()

    result = get_budget_status(trip.id, db_session)
    assert result is not None
    over_alerts = [a for a in result.alerts if a.type == "over_budget"]
    assert len(over_alerts) == 1
    assert "EUR" in over_alerts[0].message
    assert "$" not in over_alerts[0].message
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_budget_multicurrency.py -v
```

Expected: FAIL — `total_spent` will be 150 (summing `amount`) instead of 154.

- [ ] **Step 3: Update `get_budget_status()` to use `base_amount`**

In `app/services/budget_service.py`:

**a)** After `total_budget` line (line 46), add:

```python
    base_currency = trip.default_currency or "USD"
```

**b)** In the category query (lines 49-63), replace all `models.Expense.amount` with `models.Expense.base_amount`:

```python
    category_stats = (
        db.query(
            models.Expense.category,
            func.sum(models.Expense.base_amount).label("total"),
            func.sum(
                case((models.Expense.booked.is_(True), models.Expense.base_amount), else_=0)
            ).label("booked"),
            func.sum(
                case((models.Expense.booked.is_(False), models.Expense.base_amount), else_=0)
            ).label("estimated"),
        )
        .filter(models.Expense.trip_id == trip_id)
        .group_by(models.Expense.category)
        .all()
    )
```

**c)** Update `_generate_alerts` call (lines 116-123) — add `base_currency`:

```python
    alerts = _generate_alerts(
        total_budget=total_budget,
        total_spent=total_spent,
        percentage_used=percentage_used,
        by_category=by_category,
        warning_threshold=warning_threshold,
        danger_threshold=danger_threshold,
        base_currency=base_currency,
    )
```

**d)** Add `base_currency` to the return (line 125):

```python
        base_currency=base_currency,
```

**e)** Update `_generate_alerts` signature (line 155):

```python
def _generate_alerts(
    total_budget: Optional[Decimal],
    total_spent: Decimal,
    percentage_used: float,
    by_category: list[schemas.CategoryBudget],
    warning_threshold: int,
    danger_threshold: int,
    base_currency: str = "USD",
) -> list[schemas.BudgetAlert]:
```

**f)** Replace hardcoded `$` in alert messages:

- Line 173: `f"Over budget by ${over_amount:.2f}"` → `f"Over budget by {over_amount:.2f} {base_currency}"`
- Line 181: `f"Almost at budget limit! Only ${remaining:.2f} remaining"` → `f"Almost at budget limit! Only {remaining:.2f} {base_currency} remaining"`
- Line 189: `f"Approaching budget limit. ${remaining:.2f} remaining"` → `f"Approaching budget limit. {remaining:.2f} {base_currency} remaining"`

**g)** Update `check_expense_impact` (lines 234-238) to sum `base_amount`:

```python
    current_total = (
        db.query(func.coalesce(func.sum(models.Expense.base_amount), 0))
        .filter(models.Expense.trip_id == trip_id)
        .scalar()
    )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_budget_multicurrency.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 5: Run existing tests to check for regressions**

```bash
pytest tests/ -v --tb=short
```

If existing tests fail because expenses lack `base_amount`, update those test fixtures to include `base_amount=amount` and `exchange_rate=Decimal("1.0")`.

- [ ] **Step 6: Commit**

```bash
git add app/services/budget_service.py tests/test_budget_multicurrency.py
git commit -m "feat: budget service sums base_amount for multi-currency support"
```

---

### Task 7: Expense Router — Inject Conversion Logic — TDD

**Files:**
- Modify: `app/routers/expenses.py`
- Create: `tests/test_expense_currency_router.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_expense_currency_router.py`:

```python
"""
tests/test_expense_currency_router.py

Tests for expense creation/update with currency conversion.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from app import models


def _create_trip(db_session, default_currency="USD", budget=1000, user_id=None):
    """Helper to create a trip."""
    trip = models.Trip(
        name="Test Trip",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal(str(budget)),
        default_currency=default_currency,
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)
    return trip


def test_create_expense_same_currency(client, db_session, test_user):
    """When expense currency matches trip base, rate=1.0 and base_amount=amount."""
    trip = _create_trip(db_session, default_currency="USD", user_id=test_user["user"].id)

    resp = client.post("/expenses/", json={
        "trip_id": trip.id,
        "category": "food",
        "amount": 50.0,
        "currency": "USD",
        "date": str(date.today()),
        "description": "Lunch",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.0
    assert float(data["base_amount"]) == 50.0


def test_create_expense_different_currency_auto_convert(client, db_session, test_user):
    """When currencies differ and no rate provided, fetch rate automatically."""
    trip = _create_trip(db_session, default_currency="USD", user_id=test_user["user"].id)

    with patch(
        "app.routers.expenses.convert",
        return_value=(Decimal("1.08"), Decimal("54.00")),
    ):
        resp = client.post("/expenses/", json={
            "trip_id": trip.id,
            "category": "food",
            "amount": 50.0,
            "currency": "EUR",
            "date": str(date.today()),
            "description": "Dinner in Paris",
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.08
    assert float(data["base_amount"]) == 54.0


def test_create_expense_user_provided_rate(client, db_session, test_user):
    """When user provides exchange_rate, use it instead of fetching."""
    trip = _create_trip(db_session, default_currency="USD", user_id=test_user["user"].id)

    with patch("app.routers.expenses.convert") as mock_convert:
        resp = client.post("/expenses/", json={
            "trip_id": trip.id,
            "category": "food",
            "amount": 50.0,
            "currency": "EUR",
            "exchange_rate": 1.10,
            "date": str(date.today()),
            "description": "Manual rate",
        })
        mock_convert.assert_not_called()

    assert resp.status_code == 201
    data = resp.json()
    assert data["exchange_rate"] == 1.10
    assert float(data["base_amount"]) == 55.0


def test_create_expense_rate_unavailable_no_user_rate(client, db_session, test_user):
    """When rate API fails and no user rate, return 422."""
    trip = _create_trip(db_session, default_currency="USD", user_id=test_user["user"].id)

    with patch("app.routers.expenses.convert", return_value=None):
        resp = client.post("/expenses/", json={
            "trip_id": trip.id,
            "category": "food",
            "amount": 50.0,
            "currency": "EUR",
            "date": str(date.today()),
            "description": "No rate available",
        })

    assert resp.status_code == 422


def test_update_expense_recalculates_on_amount_change(client, db_session, test_user):
    """Updating amount recalculates base_amount using stored rate."""
    trip = _create_trip(db_session, default_currency="USD", user_id=test_user["user"].id)

    expense = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
    )
    db_session.add(expense)
    db_session.commit()
    db_session.refresh(expense)

    resp = client.put(f"/expenses/{expense.id}", json={"amount": 100.0})
    assert resp.status_code == 200
    data = resp.json()
    # 100 * 1.08 = 108.00
    assert float(data["base_amount"]) == 108.0


def test_check_budget_uses_base_amount(client, db_session, test_user):
    """Budget check converts expense to base currency first."""
    trip = _create_trip(
        db_session, default_currency="USD", budget=100, user_id=test_user["user"].id
    )

    with patch(
        "app.routers.expenses.convert",
        return_value=(Decimal("1.08"), Decimal("102.60")),
    ):
        resp = client.post("/expenses/check-budget/", json={
            "trip_id": trip.id,
            "category": "food",
            "amount": 95.0,
            "currency": "EUR",
            "date": str(date.today()),
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["would_exceed"] is True
    assert data["base_currency"] == "USD"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_expense_currency_router.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement conversion logic in expense router**

In `app/routers/expenses.py`:

**a)** Add import at top:

```python
from app.services.exchange_rate import convert
```

**b)** Add helper after `check_trip_access`:

```python
def _resolve_conversion(
    amount: Decimal,
    expense_currency: str,
    base_currency: str,
    user_rate: float | None,
) -> tuple[Decimal, Decimal]:
    """
    Resolve exchange_rate and base_amount for an expense.

    Returns (exchange_rate, base_amount).
    Raises HTTPException 422 if rate is needed but unavailable.
    """
    expense_currency = (expense_currency or "USD").upper()
    base_currency = (base_currency or "USD").upper()

    if expense_currency == base_currency:
        return Decimal("1.0"), amount

    if user_rate is not None:
        rate = Decimal(str(user_rate))
        from decimal import ROUND_HALF_UP
        base_amount = (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return rate, base_amount

    result = convert(amount, expense_currency, base_currency)
    if result is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Exchange rate unavailable for {expense_currency} → {base_currency}. "
                "Please provide an exchange_rate manually."
            ),
        )
    return result
```

**c)** Replace `create_expense` body (lines 77-83):

```python
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = check_trip_access(expense.trip_id, db, current_user, require_owner=True)
    base_currency = trip.default_currency or "USD"

    exchange_rate, base_amount = _resolve_conversion(
        amount=Decimal(str(expense.amount)),
        expense_currency=expense.currency,
        base_currency=base_currency,
        user_rate=expense.exchange_rate,
    )

    expense_data = expense.model_dump()
    expense_data["exchange_rate"] = exchange_rate
    expense_data["base_amount"] = base_amount

    db_expense = models.Expense(**expense_data)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense
```

**d)** Replace `update_expense` body (lines 112-124):

```python
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    trip = check_trip_access(expense.trip_id, db, current_user, require_owner=True)
    base_currency = trip.default_currency or "USD"

    update_data = expense_update.model_dump(exclude_unset=True)

    amount_changed = "amount" in update_data
    currency_changed = "currency" in update_data
    rate_changed = "exchange_rate" in update_data

    for key, value in update_data.items():
        if key != "exchange_rate" or value is not None:
            setattr(expense, key, value)

    if amount_changed or currency_changed or rate_changed:
        current_amount = Decimal(str(update_data.get("amount", expense.amount)))
        current_currency = update_data.get("currency", expense.currency) or "USD"
        user_rate = update_data.get("exchange_rate")

        if user_rate is None and not rate_changed:
            if amount_changed and not currency_changed:
                # Only amount changed: reuse stored rate
                from decimal import ROUND_HALF_UP
                expense.base_amount = (
                    current_amount * Decimal(str(expense.exchange_rate))
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                exchange_rate, base_amount = _resolve_conversion(
                    current_amount, current_currency, base_currency, None
                )
                expense.exchange_rate = exchange_rate
                expense.base_amount = base_amount
        else:
            exchange_rate, base_amount = _resolve_conversion(
                current_amount, current_currency, base_currency, user_rate
            )
            expense.exchange_rate = exchange_rate
            expense.base_amount = base_amount

    db.commit()
    db.refresh(expense)
    return expense
```

**e)** Replace `check_budget` body (lines 56-66):

```python
def check_budget(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Check if adding an expense would exceed the trip budget."""
    trip = check_trip_access(expense.trip_id, db, current_user)
    base_currency = trip.default_currency or "USD"

    _, base_amount = _resolve_conversion(
        amount=Decimal(str(expense.amount)),
        expense_currency=expense.currency,
        base_currency=base_currency,
        user_rate=expense.exchange_rate,
    )

    impact = check_expense_impact(expense.trip_id, base_amount, db)
    if impact is None:
        return schemas.BudgetImpactResponse(would_exceed=False, base_currency=base_currency)
    return schemas.BudgetImpactResponse(**impact, base_currency=base_currency)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_expense_currency_router.py -v
```

Expected: all 6 tests PASS

- [ ] **Step 5: Run full test suite**

```bash
pytest tests/ -v --tb=short
```

- [ ] **Step 6: Commit**

```bash
git add app/routers/expenses.py tests/test_expense_currency_router.py
git commit -m "feat: inject currency conversion in expense create/update/check-budget"
```

---

### Task 8: Exchange Rate Pair Endpoint

**Files:**
- Modify: `app/routers/exchange_rates.py`

The existing router at `app/routers/exchange_rates.py` already handles exchange rates. Add the pair endpoint here rather than creating a new file:

- [ ] **Step 1: Write the failing tests**

Create `tests/test_exchange_rate_pair.py`:

```python
"""Tests for GET /exchange-rates/pair/ endpoint."""
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_pair_same_currency():
    """Same currency returns rate 1.0 without calling API."""
    resp = client.get("/exchange-rates/pair/", params={"from": "USD", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] == 1.0
    assert data["from"] == "USD"
    assert data["to"] == "USD"


@patch("app.routers.exchange_rates.get_rates")
def test_pair_different_currency(mock_get_rates):
    """Different currencies returns rate from exchange rate service."""
    mock_get_rates.return_value = {"USD": 1.08}
    resp = client.get("/exchange-rates/pair/", params={"from": "EUR", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] == 1.08
    assert data["from"] == "EUR"
    assert data["to"] == "USD"
    mock_get_rates.assert_called_once_with("EUR")


@patch("app.routers.exchange_rates.get_rates")
def test_pair_rate_unavailable(mock_get_rates):
    """Returns null rate when service is unavailable."""
    mock_get_rates.return_value = None
    resp = client.get("/exchange-rates/pair/", params={"from": "EUR", "to": "USD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["rate"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_exchange_rate_pair.py -v
```

Expected: FAIL — endpoint doesn't exist yet (404).

- [ ] **Step 3: Implement the pair endpoint**

In `app/routers/exchange_rates.py`, add after the existing `fetch_exchange_rates` function:

```python
@router.get("/pair/")
def get_exchange_rate_pair(
    from_currency: str = Query(..., alias="from", min_length=3, max_length=3),
    to_currency: str = Query(..., alias="to", min_length=3, max_length=3),
):
    """
    Return the exchange rate for a single currency pair.

    GET /exchange-rates/pair/?from=EUR&to=USD

    Returns ``{"rate": 1.08, "from": "EUR", "to": "USD"}`` on success,
    or ``{"rate": null, ...}`` if unavailable.
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return {"rate": 1.0, "from": from_currency, "to": to_currency}

    rates = get_rates(from_currency)
    rate = rates.get(to_currency) if rates else None

    return {"rate": rate, "from": from_currency, "to": to_currency}
```

Add `Query` to the existing import if not already there:

```python
from fastapi import APIRouter, HTTPException, Query
```

> **Note:** The spec says `GET /exchange-rate/` but the existing router has `prefix="/exchange-rates"`, so we use `/pair/` to get `/exchange-rates/pair/?from=EUR&to=USD`. The frontend API client (Task 10) uses this path.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_exchange_rate_pair.py -v
```

Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/exchange_rates.py tests/test_exchange_rate_pair.py
git commit -m "feat: add GET /exchange-rates/pair/ endpoint with tests"
```

---

### Task 9: Frontend Types — Add Currency Fields

**Files:**
- Modify: `frontend/lib/types.ts`

- [ ] **Step 1: Add fields to `Expense` interface (after line 82 `currency: string`)**

```typescript
  exchange_rate: number;
  base_amount: number | null;
```

- [ ] **Step 2: Add `exchange_rate` to `ExpenseFormData` (after line 228 `currency?: string`)**

```typescript
  exchange_rate?: number | null;
```

- [ ] **Step 3: Add `base_currency` to `BudgetStatusResponse` (after `danger_threshold`)**

```typescript
  base_currency: string;
```

- [ ] **Step 4: Add `base_currency` to `BudgetImpact` (after `percentage`)**

```typescript
  base_currency?: string;
```

- [ ] **Step 5: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

Note: will likely produce errors in components — these are fixed in Tasks 10-13.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add lib/types.ts
git commit -m "feat: add exchange_rate, base_amount, base_currency to frontend types"
```

---

### Task 10: Frontend API Client — Add Rate Lookup

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add `exchangeApi` object (after `expenseApi`, around line 226)**

```typescript
export const exchangeApi = {
  getRate: (from: string, to: string) =>
    api.get<{ rate: number | null; from: string; to: string }>(
      `/exchange-rates/pair/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
};
```

- [ ] **Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add lib/api.ts
git commit -m "feat: add exchangeApi.getRate() to frontend API client"
```

---

### Task 11: Expense Form — Currency Dropdown, Rate Field, Auto-Fetch

**Files:**
- Modify: `frontend/components/expenses/ExpenseForm.tsx`
- Modify: `frontend/components/expenses/useExpenseForm.ts`
- Modify: `frontend/components/expenses/ExpenseList.tsx:48-54`

- [ ] **Step 1: Update `ExpenseForm` props and add currency list**

In `frontend/components/expenses/ExpenseForm.tsx`:

**a)** Add import at top:

```typescript
import { useState, useEffect } from 'react';
import { exchangeApi } from '@/lib/api';
```

**b)** Add currency list before the component:

```typescript
const commonCurrencies = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
  'SEK', 'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY',
  'INR', 'BRL', 'ZAR', 'THB',
];
```

**c)** Add `baseCurrency` to the props interface:

```typescript
interface ExpenseFormProps {
  formData: ExpenseFormData;
  isEditing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  updateField: <K extends keyof ExpenseFormData>(
    field: K,
    value: ExpenseFormData[K]
  ) => void;
  baseCurrency?: string;
}
```

**d)** Destructure `baseCurrency` in the component params and add rate auto-fetch:

```typescript
export function ExpenseForm({
  formData,
  isEditing,
  onSubmit,
  onCancel,
  updateField,
  baseCurrency = 'USD',
}: ExpenseFormProps) {
  const [fetchingRate, setFetchingRate] = useState(false);

  // Auto-fetch exchange rate when currency changes
  useEffect(() => {
    const currency = formData.currency || 'USD';
    if (currency === baseCurrency || isEditing) return;

    let cancelled = false;
    setFetchingRate(true);

    exchangeApi.getRate(currency, baseCurrency).then(({ data }) => {
      if (!cancelled && data.rate != null) {
        updateField('exchange_rate', data.rate);
      }
    }).catch(() => {
      // Rate unavailable — user can enter manually
    }).finally(() => {
      if (!cancelled) setFetchingRate(false);
    });

    return () => { cancelled = true; };
  }, [formData.currency, baseCurrency]);
```

**e)** After the "Amount" input (around line 51), add currency dropdown:

```tsx
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Currency</label>
          <select
            value={formData.currency || 'USD'}
            onChange={(e) => {
              updateField('currency', e.target.value);
              updateField('exchange_rate', null);
            }}
            className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs"
          >
            {commonCurrencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
```

**f)** After the currency dropdown, add conditional rate field:

```tsx
        {formData.currency && formData.currency !== baseCurrency && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Exchange Rate
              <span className="text-gray-400 font-normal ml-1">
                (1 {formData.currency} = ? {baseCurrency})
              </span>
            </label>
            <input
              type="number"
              value={formData.exchange_rate ?? ''}
              onChange={(e) => updateField('exchange_rate', parseFloat(e.target.value) || null)}
              placeholder={fetchingRate ? 'Fetching rate...' : 'e.g., 1.08'}
              step="0.000001"
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 block w-full px-3 py-2.5 shadow-xs placeholder:text-slate-400"
            />
            {formData.exchange_rate && formData.amount ? (
              <p className="text-xs text-slate-500 mt-0.5">
                ≈ {(formData.amount * formData.exchange_rate).toFixed(2)} {baseCurrency}
              </p>
            ) : null}
          </div>
        )}
```

- [ ] **Step 2: Update `useExpenseForm.ts` to preserve `exchange_rate` in `startEdit`**

In `frontend/components/expenses/useExpenseForm.ts`, update the `startEdit` function (line 68-81) to include `exchange_rate`:

```typescript
  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      trip_id: tripId,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      currency: expense.currency,
      exchange_rate: expense.exchange_rate,
      booked: expense.booked,
      paid: expense.paid,
      cancel_by_date: expense.cancel_by_date || '',
    });
  };
```

- [ ] **Step 3: Pass `baseCurrency` from `ExpenseList.tsx`**

In `frontend/components/expenses/ExpenseList.tsx`, update the `<ExpenseForm>` usage (lines 48-54). Import `useTripCurrency`:

```typescript
import { useTripCurrency } from '@/lib/trip-context';
```

Add inside the component:

```typescript
const baseCurrency = useTripCurrency();
```

Then pass the prop:

```tsx
      <ExpenseForm
        formData={formData}
        isEditing={isEditing}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        updateField={updateField}
        baseCurrency={baseCurrency}
      />
```

- [ ] **Step 4: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/expenses/ExpenseForm.tsx components/expenses/useExpenseForm.ts components/expenses/ExpenseList.tsx
git commit -m "feat: expense form with currency dropdown, rate auto-fetch, and live preview"
```

---

### Task 12: Budget Components — Use `base_currency` From Response

**Files:**
- Modify: `frontend/components/budget/BudgetCard.tsx`
- Modify: `frontend/components/budget/BudgetProgress.tsx`
- Modify: `frontend/components/expenses/BudgetExceededModal.tsx`

- [ ] **Step 1: Update BudgetCard to prefer `base_currency` from response**

In `frontend/components/budget/BudgetCard.tsx`, after line 16 (`const currency = useTripCurrency()`), add:

```typescript
  const displayCurrency = budget?.base_currency || currency;
```

Then change `currency={currency}` to `currency={displayCurrency}` on both the `<BudgetProgress>` (line 52) and `<BudgetBreakdown>` (line 62) components.

- [ ] **Step 2: BudgetProgress already accepts `currency` prop — no changes needed**

`BudgetProgress` already uses `Intl.NumberFormat` with the `currency` prop (line 49-56). It will automatically format with the correct currency code. No hardcoded `$` to fix.

- [ ] **Step 3: Update BudgetExceededModal to format with currency code**

In `frontend/components/expenses/BudgetExceededModal.tsx`:

**a)** Add at the top of the component function:

```typescript
  const currency = impact.base_currency || 'USD';
  const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;
```

**b)** Replace hardcoded `$` formatting:
- Line 45: `${impact.over_by.toFixed(2)}` → `{fmt(impact.over_by)}`
- Line 53: `${impact.new_total.toFixed(2)} / ${impact.budget.toFixed(2)}` → `{fmt(impact.new_total)} / {fmt(impact.budget)}`

- [ ] **Step 4: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add components/budget/BudgetCard.tsx components/expenses/BudgetExceededModal.tsx
git commit -m "feat: budget components use base_currency from API response"
```

---

### Task 13: Rebase Currency Endpoint

**Files:**
- Modify: `app/routers/trips.py`
- Create: `tests/test_rebase_currency.py`

Per the spec: when a user changes the trip's base currency, all expenses need batch recalculation.

- [ ] **Step 1: Write failing tests**

Create `tests/test_rebase_currency.py`:

```python
"""
tests/test_rebase_currency.py

Tests for POST /trips/{trip_id}/rebase-currency/ endpoint.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from app import models


def _create_trip_with_expenses(db_session, user_id):
    """Create a trip with two expenses in different currencies."""
    trip = models.Trip(
        name="Rebase test",
        start_date=date.today(),
        end_date=date.today(),
        budget=Decimal("1000.00"),
        default_currency="USD",
        user_id=user_id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    e1 = models.Expense(
        trip_id=trip.id,
        category="food",
        amount=Decimal("50.00"),
        currency="EUR",
        exchange_rate=Decimal("1.08"),
        base_amount=Decimal("54.00"),
        date=date.today(),
    )
    e2 = models.Expense(
        trip_id=trip.id,
        category="lodging",
        amount=Decimal("100.00"),
        currency="USD",
        exchange_rate=Decimal("1.0"),
        base_amount=Decimal("100.00"),
        date=date.today(),
    )
    db_session.add_all([e1, e2])
    db_session.commit()
    return trip


def test_rebase_currency_recalculates_all_expenses(client, db_session, test_user):
    """Rebasing to EUR should recalculate all expenses."""
    trip = _create_trip_with_expenses(db_session, test_user["user"].id)

    # Mock: EUR->EUR = 1.0, USD->EUR = 0.92
    def mock_convert(amount, from_curr, to_curr):
        if from_curr == to_curr:
            return (Decimal("1.0"), amount)
        if from_curr == "EUR" and to_curr == "EUR":
            return (Decimal("1.0"), amount)
        if from_curr == "USD" and to_curr == "EUR":
            rate = Decimal("0.92")
            from decimal import ROUND_HALF_UP
            return (rate, (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        return None

    with patch("app.routers.trips.convert", side_effect=mock_convert):
        resp = client.post(f"/trips/{trip.id}/rebase-currency/", json={
            "new_currency": "EUR",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["new_currency"] == "EUR"
    assert data["updated_count"] == 2
    assert data["failed_count"] == 0


def test_rebase_currency_reports_failures(client, db_session, test_user):
    """If rate unavailable for some expenses, report them as failures."""
    trip = _create_trip_with_expenses(db_session, test_user["user"].id)

    def mock_convert(amount, from_curr, to_curr):
        if from_curr == "EUR" and to_curr == "GBP":
            return None  # simulate failure
        if from_curr == "USD" and to_curr == "GBP":
            return (Decimal("0.79"), (amount * Decimal("0.79")).quantize(Decimal("0.01")))
        return None

    with patch("app.routers.trips.convert", side_effect=mock_convert):
        resp = client.post(f"/trips/{trip.id}/rebase-currency/", json={
            "new_currency": "GBP",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["failed_count"] == 1
    assert len(data["failed_expense_ids"]) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_rebase_currency.py -v
```

Expected: FAIL — endpoint doesn't exist yet.

- [ ] **Step 3: Implement the rebase endpoint**

In `app/routers/trips.py`, add import at top:

```python
from app.services.exchange_rate import convert
```

Add the endpoint (after the existing budget-status endpoint):

```python
@router.post("/trips/{trip_id}/rebase-currency/")
def rebase_currency(
    trip_id: int,
    payload: schemas.RebaseCurrencyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Batch-recalculate all expenses for a new base currency."""
    trip = get_trip_or_404(trip_id, db, current_user)
    new_currency = payload.new_currency  # Already validated by Pydantic

    expenses = db.query(models.Expense).filter(models.Expense.trip_id == trip_id).all()

    updated = 0
    failed_ids = []

    for expense in expenses:
        result = convert(
            Decimal(str(expense.amount)),
            expense.currency or "USD",
            new_currency,
        )
        if result is None:
            failed_ids.append(expense.id)
            continue

        expense.exchange_rate = result[0]
        expense.base_amount = result[1]
        updated += 1

    trip.default_currency = new_currency
    db.commit()

    return {
        "new_currency": new_currency,
        "updated_count": updated,
        "failed_count": len(failed_ids),
        "failed_expense_ids": failed_ids,
    }
```

Note: `get_trip_or_404` is already imported/defined in the trips router. Check the file for the exact helper name and adjust.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_rebase_currency.py -v
```

Expected: all 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/trips.py tests/test_rebase_currency.py
git commit -m "feat: add POST /trips/{trip_id}/rebase-currency/ for batch recalculation"
```

---

### Task 14: Base Currency Inference

**Files:**
- Modify: `app/services/exchange_rate.py`
- Create: `tests/test_infer_currency.py`
- Modify: `app/routers/destinations.py:55-75`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_infer_currency.py`:

```python
"""Tests for infer_base_currency() helper."""
from app.services.exchange_rate import infer_base_currency


def test_infer_from_country_france():
    assert infer_base_currency("France") == "EUR"


def test_infer_from_country_japan():
    assert infer_base_currency("Japan") == "JPY"


def test_infer_from_country_united_states():
    assert infer_base_currency("United States") == "USD"


def test_infer_from_country_united_kingdom():
    assert infer_base_currency("United Kingdom") == "GBP"


def test_infer_from_country_case_insensitive():
    assert infer_base_currency("france") == "EUR"


def test_infer_unknown_country_falls_back_to_usd():
    assert infer_base_currency("Atlantis") == "USD"


def test_infer_empty_string_falls_back_to_usd():
    assert infer_base_currency("") == "USD"


def test_infer_none_falls_back_to_usd():
    assert infer_base_currency(None) == "USD"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_infer_currency.py -v
```

Expected: FAIL with `ImportError` — `infer_base_currency` doesn't exist yet.

- [ ] **Step 3: Implement `infer_base_currency()`**

Add to the bottom of `app/services/exchange_rate.py`:

```python
# Static country → currency lookup. Covers the most common travel destinations.
# Falls back to "USD" for unknown countries.
_COUNTRY_CURRENCY: dict[str, str] = {
    "united states": "USD",
    "canada": "CAD",
    "united kingdom": "GBP",
    "japan": "JPY",
    "china": "CNY",
    "australia": "AUD",
    "new zealand": "NZD",
    "switzerland": "CHF",
    "india": "INR",
    "brazil": "BRL",
    "mexico": "MXN",
    "south korea": "KRW",
    "singapore": "SGD",
    "hong kong": "HKD",
    "thailand": "THB",
    "vietnam": "VND",
    "indonesia": "IDR",
    "malaysia": "MYR",
    "philippines": "PHP",
    "taiwan": "TWD",
    "south africa": "ZAR",
    "turkey": "TRY",
    "russia": "RUB",
    "egypt": "EGP",
    "morocco": "MAD",
    "colombia": "COP",
    "argentina": "ARS",
    "chile": "CLP",
    "peru": "PEN",
    "israel": "ILS",
    "united arab emirates": "AED",
    "saudi arabia": "SAR",
    "norway": "NOK",
    "sweden": "SEK",
    "denmark": "DKK",
    "iceland": "ISK",
    "czech republic": "CZK",
    "czechia": "CZK",
    "poland": "PLN",
    "hungary": "HUF",
    "romania": "RON",
    "croatia": "EUR",
    # Eurozone countries
    "france": "EUR",
    "germany": "EUR",
    "italy": "EUR",
    "spain": "EUR",
    "portugal": "EUR",
    "netherlands": "EUR",
    "belgium": "EUR",
    "austria": "EUR",
    "ireland": "EUR",
    "greece": "EUR",
    "finland": "EUR",
    "estonia": "EUR",
    "latvia": "EUR",
    "lithuania": "EUR",
    "slovakia": "EUR",
    "slovenia": "EUR",
    "luxembourg": "EUR",
    "malta": "EUR",
    "cyprus": "EUR",
}


def infer_base_currency(country: str | None) -> str:
    """
    Map a country name to its ISO 4217 currency code.

    Returns "USD" if the country is unknown, empty, or None.
    """
    if not country:
        return "USD"
    return _COUNTRY_CURRENCY.get(country.strip().lower(), "USD")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_infer_currency.py -v
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/exchange_rate.py tests/test_infer_currency.py
git commit -m "feat: add infer_base_currency() country-to-currency lookup"
```

- [ ] **Step 6: Wire `infer_base_currency` into destination creation**

The spec says `infer_base_currency` is "called when a trip is created or when the first destination is added." Since trip creation doesn't have a destination yet, the logical trigger is when the first destination is added to a trip.

In `app/routers/destinations.py`, add import at top:

```python
from app.services.exchange_rate import infer_base_currency
```

After `db.refresh(db_destination)` (line 74), add:

```python
    # Infer base currency from first destination's country if trip has no explicit currency
    trip = db.query(models.Trip).get(destination.trip_id)
    if trip and not trip.default_currency and db_destination.country:
        existing_count = (
            db.query(models.Destination)
            .filter(
                models.Destination.trip_id == destination.trip_id,
                models.Destination.id != db_destination.id,
            )
            .count()
        )
        if existing_count == 0:  # This is the first destination
            trip.default_currency = infer_base_currency(db_destination.country)
            db.commit()
```

- [ ] **Step 7: Write test for inference wiring**

Add to `tests/test_infer_currency.py`. This test uses the `client` and `test_user` fixtures from `conftest.py`. The `client` fixture auto-injects auth headers; `test_user` yields `{"user": user, "token": token, "headers": {...}}`.

```python
from app import models


def test_first_destination_sets_trip_currency(client, test_user, testing_session_local):
    """Adding the first destination with a country infers the trip's base currency."""
    db = testing_session_local()
    user = test_user["user"]

    # Create trip with no default_currency set
    trip = models.Trip(
        name="Euro Trip",
        start_date="2026-04-01",
        end_date="2026-04-10",
        user_id=user.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    resp = client.post(
        f"/trips/{trip.id}/destinations/",
        json={"trip_id": trip.id, "name": "Paris", "country": "France", "order": 1},
    )
    assert resp.status_code == 200

    db.refresh(trip)
    assert trip.default_currency == "EUR"
    db.close()
```

- [ ] **Step 8: Run test and verify**

```bash
pytest tests/test_infer_currency.py -v
```

Expected: all tests PASS

- [ ] **Step 9: Commit**

```bash
git add app/routers/destinations.py tests/test_infer_currency.py
git commit -m "feat: infer trip base currency from first destination's country"
```

---

### Task 15: Frontend Display Toggle — Original vs Base Currency

**Files:**
- Create: `frontend/components/expenses/CurrencyToggle.tsx`
- Modify: `frontend/components/expenses/ExpenseItem.tsx`
- Modify: `frontend/components/expenses/ExpenseList.tsx`

- [ ] **Step 1: Create the `CurrencyToggle` component**

Create `frontend/components/expenses/CurrencyToggle.tsx`:

```tsx
'use client';

import { ArrowLeftRight } from 'lucide-react';

interface CurrencyToggleProps {
  showBase: boolean;
  onToggle: () => void;
  label?: string;
}

export function CurrencyToggle({ showBase, onToggle, label }: CurrencyToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
      title={showBase ? 'Show original currency' : 'Show base currency'}
      aria-label={label ?? (showBase ? 'Show original currency' : 'Show base currency')}
    >
      <ArrowLeftRight className="w-3 h-3" />
      {showBase ? 'Base' : 'Original'}
    </button>
  );
}
```

- [ ] **Step 2: Modify `ExpenseItem` to support the toggle**

In `frontend/components/expenses/ExpenseItem.tsx`, update the component to accept `baseCurrency` and `showBaseCurrency` props, then conditionally display original or converted amount.

Update the interface:

```tsx
interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
  baseCurrency?: string;
  showBaseCurrency?: boolean;
}
```

Update the component signature:

```tsx
export function ExpenseItem({ expense, onEdit, onDelete, baseCurrency, showBaseCurrency = true }: ExpenseItemProps) {
```

Replace the amount display block (the `<div className="text-right">` section):

```tsx
        <div className="text-right">
          {showBaseCurrency && expense.base_amount != null && baseCurrency ? (
            <>
              <p className="font-semibold text-lg">
                {parseFloat(expense.base_amount.toString()).toFixed(2)} {baseCurrency}
              </p>
              {expense.currency !== baseCurrency && (
                <p className="text-xs text-gray-500">
                  {parseFloat(expense.amount.toString()).toFixed(2)} {expense.currency}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold text-lg">
                {parseFloat(expense.amount.toString()).toFixed(2)} {expense.currency}
              </p>
              {expense.base_amount != null && baseCurrency && expense.currency !== baseCurrency && (
                <p className="text-xs text-gray-500">
                  {parseFloat(expense.base_amount.toString()).toFixed(2)} {baseCurrency}
                </p>
              )}
            </>
          )}
        </div>
```

- [ ] **Step 3: Wire toggle state into `ExpenseList.tsx`**

In `frontend/components/expenses/ExpenseList.tsx`, add imports:

```typescript
import { useState } from 'react';
import { CurrencyToggle } from './CurrencyToggle';
```

Inside the component, add state (after existing hooks):

```typescript
const [showBaseCurrency, setShowBaseCurrency] = useState(true);
```

Add the toggle button above the expense list (before the expense items loop):

```tsx
      {baseCurrency && (
        <div className="flex justify-end mb-2">
          <CurrencyToggle
            showBase={showBaseCurrency}
            onToggle={() => setShowBaseCurrency((prev) => !prev)}
          />
        </div>
      )}
```

Pass the props to each `<ExpenseItem>`:

```tsx
      <ExpenseItem
        key={expense.id}
        expense={expense}
        onEdit={startEdit}
        onDelete={handleDelete}
        baseCurrency={baseCurrency}
        showBaseCurrency={showBaseCurrency}
      />
```

- [ ] **Step 4: Run frontend lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: PASS (the `Expense` type was updated in Task 9 to include `base_amount` and `exchange_rate`)

- [ ] **Step 5: Commit**

```bash
git add frontend/components/expenses/CurrencyToggle.tsx frontend/components/expenses/ExpenseItem.tsx frontend/components/expenses/ExpenseList.tsx
git commit -m "feat: add currency display toggle for original vs base amount"
```

---

### Task 16: Final Verification

- [ ] **Step 1: Run full backend test suite**

```bash
source .venv/bin/activate
pytest tests/ -v --tb=short
```

Expected: all tests PASS

- [ ] **Step 2: Run backend linter**

```bash
source .venv/bin/activate
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
```

Expected: no new errors

- [ ] **Step 3: Run frontend lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Manual smoke test**

Start both servers and verify:
1. Create an expense in a different currency than the trip's base — rate auto-fetches, base_amount calculated
2. Create an expense in the same currency — rate=1.0, no rate field shown
3. Override the auto-fetched rate — base_amount uses the override
4. Check budget status — totals in base currency with ISO codes in alerts
5. Budget exceeded modal — shows currency codes, not `$`
6. Expense list — toggle between original and base currency display
7. Trip creation with a destination in France — base currency auto-inferred as EUR

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add app/ tests/ frontend/
git commit -m "chore: final cleanup for multi-currency budget support"
```
