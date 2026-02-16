"""
app/schemas/expense.py - Expense Pydantic schemas

Defines Expense-related Pydantic models: `ExpenseBase`, `ExpenseCreate`,
`ExpenseUpdate`, and `Expense`. Also includes `ExpenseSummary`.

Author: Travel Planner Team
"""

from pydantic import BaseModel, field_validator
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
    segment_id: Optional[int] = None

    @field_validator("destination_id")
    @classmethod
    def validate_at_least_one_link(cls, v, info):
        """Ensure at least one of destination_id, activity_id, or segment_id is provided"""
        activity_id = info.data.get("activity_id")
        segment_id = info.data.get("segment_id")
        if v is None and activity_id is None and segment_id is None:
            raise ValueError(
                "At least one of destination_id, activity_id, or segment_id must be provided"
            )
        return v


class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
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
    segment_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ExpenseSummary(BaseModel):
    """Summary of expenses for a trip"""

    total: float
    paid_total: float
    unpaid_total: float
    by_category: dict[str, float]
    count: int
