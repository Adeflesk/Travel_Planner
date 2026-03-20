"""
app/schemas/expense.py - Expense Pydantic schemas
"""

from pydantic import BaseModel
from datetime import date as DateType
from decimal import Decimal
from typing import Optional


class ExpenseBase(BaseModel):
    category: str
    amount: Decimal
    currency: str = "USD"
    description: Optional[str] = None
    date: DateType
    booked: bool = False
    paid: bool = False
    cancel_by_date: Optional[DateType] = None


class ExpenseCreate(ExpenseBase):
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None
    exchange_rate: float | None = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    exchange_rate: float | None = None
    description: Optional[str] = None
    date: Optional[DateType] = None
    booked: Optional[bool] = None
    paid: Optional[bool] = None
    cancel_by_date: Optional[DateType] = None


class Expense(ExpenseBase):
    id: int
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None
    exchange_rate: float = 1.0
    base_amount: Decimal | None = None

    model_config = {"from_attributes": True}


class ExpenseSummary(BaseModel):
    """Summary of expenses for a trip"""

    total: float
    paid_total: float
    unpaid_total: float
    by_category: dict[str, float]
    count: int
