"""
app/routers/expenses.py - Expense endpoints router

CRUD and trip-scoped expense endpoints and summary.
All endpoints require authentication.

Author: Travel Planner Team
"""

from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.budget_service import check_expense_impact
from app.services.expense_service import get_expense_summary as svc_get_expense_summary
from database import get_db

router = APIRouter()


def check_trip_access(
    trip_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Trip:
    """Check user has access to the trip."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return trip

    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return trip

    raise HTTPException(status_code=404, detail="Trip not found")


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
    check_trip_access(expense.trip_id, db, current_user)
    impact = check_expense_impact(expense.trip_id, Decimal(str(expense.amount)), db)
    if impact is None:
        return schemas.BudgetImpactResponse(would_exceed=False)
    return schemas.BudgetImpactResponse(**impact)


@router.post(
    "/expenses/", response_model=schemas.Expense, status_code=201, tags=["expenses"]
)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access(expense.trip_id, db, current_user, require_owner=True)

    db_expense = models.Expense(**expense.model_dump())
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
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access(trip_id, db, current_user)
    expenses = (
        db.query(models.Expense)
        .filter(models.Expense.trip_id == trip_id)
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

    check_trip_access(expense.trip_id, db, current_user, require_owner=True)

    for key, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)

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

    check_trip_access(expense.trip_id, db, current_user, require_owner=True)

    db.delete(expense)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/expenses/summary/",
    response_model=schemas.ExpenseSummary,
    tags=["expenses"],
)
def get_expense_summary(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_trip_access(trip_id, db, current_user)
    result = svc_get_expense_summary(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result
