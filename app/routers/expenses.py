"""
app/routers/expenses.py - Expense endpoints router

CRUD and trip-scoped expense endpoints and summary.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas, models
from database import get_db
from app.services.expense_service import get_expense_summary as svc_get_expense_summary

router = APIRouter()


@router.post(
    "/expenses/", response_model=schemas.Expense, status_code=201, tags=["expenses"]
)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == expense.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

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
def get_trip_expenses(trip_id: int, db: Session = Depends(get_db)):
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
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    for key, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=204, tags=["expenses"])
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None


@router.get(
    "/trips/{trip_id}/expenses/summary/",
    response_model=schemas.ExpenseSummary,
    tags=["expenses"],
)
def get_expense_summary(trip_id: int, db: Session = Depends(get_db)):
    result = svc_get_expense_summary(trip_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return result
