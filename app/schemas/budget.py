"""
app/schemas/budget.py - Budget status Pydantic schemas

Defines schemas for budget tracking, alerts, and category breakdown.

Author: Travel Planner Team
"""

from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel


BudgetStatus = Literal["normal", "warning", "danger", "over"]


class CategoryBudget(BaseModel):
    """Budget status for a single expense category."""

    category: str
    spent: Decimal
    booked: Decimal
    estimated: Decimal
    percentage: float
    status: BudgetStatus


class BudgetAlert(BaseModel):
    """A budget alert for the trip."""

    type: Literal["over_budget", "over_category", "approaching_limit"]
    message: str
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    percentage: Optional[float] = None


class BudgetStatusResponse(BaseModel):
    """Complete budget status for a trip."""

    total_budget: Optional[Decimal]
    total_spent: Decimal
    booked_amount: Decimal
    estimated_amount: Decimal
    percentage_used: float
    remaining: Decimal
    status: BudgetStatus
    by_category: List[CategoryBudget]
    alerts: List[BudgetAlert]
    warning_threshold: int = 75
    danger_threshold: int = 90

    model_config = {"from_attributes": True}


class BudgetImpactResponse(BaseModel):
    """Response from checking expense impact on budget."""

    would_exceed: bool
    over_by: Optional[float] = None
    new_total: Optional[float] = None
    budget: Optional[float] = None
    percentage: Optional[float] = None
