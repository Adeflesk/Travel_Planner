"""
app/routers/expenses.py - Expense endpoints router

CRUD and trip-scoped expense endpoints and summary.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from decimal import Decimal

from app import schemas, models
from app.core.deps import get_current_user
from app.core.trip_access import TripAccess, get_trip_with_access
from database import get_db
from app.services.budget_service import check_expense_impact
from app.services.expense_service import get_expense_summary as svc_get_expense_summary
from app.services.exchange_rate import convert

router = APIRouter()


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
    from decimal import ROUND_HALF_UP

    expense_currency = (expense_currency or "USD").upper()
    base_currency = (base_currency or "USD").upper()

    if expense_currency == base_currency:
        return Decimal("1.0"), amount

    if user_rate is not None:
        rate = Decimal(str(user_rate))
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


@router.post(
    "/expenses/check-budget/",
    response_model=schemas.BudgetImpactResponse,
    tags=["expenses"],
)
def check_budget(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Check if adding an expense would exceed the trip budget."""
    trip = get_trip_with_access(expense.trip_id, db, current_user, "view")
    base_currency = trip.default_currency or "USD"

    _, base_amount = _resolve_conversion(
        amount=Decimal(str(expense.amount)),
        expense_currency=expense.currency,
        base_currency=base_currency,
        user_rate=expense.exchange_rate,
    )

    impact = check_expense_impact(expense.trip_id, base_amount, db)
    if impact is None:
        return schemas.BudgetImpactResponse(
            would_exceed=False, base_currency=base_currency
        )
    return schemas.BudgetImpactResponse(**impact, base_currency=base_currency)


@router.post(
    "/expenses/", response_model=schemas.Expense, status_code=201, tags=["expenses"]
)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    trip = get_trip_with_access(expense.trip_id, db, current_user, "edit")
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


@router.get(
    "/trips/{trip_id}/expenses/",
    response_model=List[schemas.Expense],
    tags=["expenses"],
)
def get_trip_expenses(
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    expenses = (
        db.query(models.Expense)
        .filter(models.Expense.trip_id == trip.id)
        .order_by(models.Expense.date)
        .all()
    )
    return expenses


@router.put("/expenses/{expense_id}", response_model=schemas.Expense, tags=["expenses"])
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    trip = get_trip_with_access(expense.trip_id, db, current_user, "edit")
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


@router.delete("/expenses/{expense_id}", status_code=204, tags=["expenses"])
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    get_trip_with_access(expense.trip_id, db, current_user, "edit")

    db.delete(expense)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/expenses/summary/",
    response_model=schemas.ExpenseSummary,
    tags=["expenses"],
)
def get_expense_summary(
    trip: models.Trip = Depends(TripAccess("view")),
    db: Session = Depends(get_db),
):
    result = svc_get_expense_summary(trip.id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result
