"""
app/services/budget_service.py - Budget calculation service

Provides budget tracking, alerts, and category breakdown for trips.

Author: Travel Planner Team
"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app import models, schemas


# Default thresholds
WARNING_THRESHOLD = 75  # percentage
DANGER_THRESHOLD = 90  # percentage


def get_budget_status(
    trip_id: int,
    db: Session,
    warning_threshold: int = WARNING_THRESHOLD,
    danger_threshold: int = DANGER_THRESHOLD,
) -> Optional[schemas.BudgetStatusResponse]:
    """
    Calculate complete budget status for a trip.

    Args:
        trip_id: The trip ID
        db: Database session
        warning_threshold: Percentage to trigger warning (default 75)
        danger_threshold: Percentage to trigger danger (default 90)

    Returns:
        BudgetStatusResponse or None if trip not found
    """
    # Get trip with budget
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return None

    total_budget = Decimal(str(trip.budget)) if trip.budget else None

    # Get expense totals by category
    category_stats = (
        db.query(
            models.Expense.category,
            func.sum(models.Expense.amount).label("total"),
            func.sum(
                case((models.Expense.booked.is_(True), models.Expense.amount), else_=0)
            ).label("booked"),
            func.sum(
                case((models.Expense.booked.is_(False), models.Expense.amount), else_=0)
            ).label("estimated"),
        )
        .filter(models.Expense.trip_id == trip_id)
        .group_by(models.Expense.category)
        .all()
    )

    # Calculate totals
    total_spent = Decimal("0")
    booked_amount = Decimal("0")
    estimated_amount = Decimal("0")
    by_category = []

    for cat_name, cat_total, cat_booked, cat_estimated in category_stats:
        cat_spent = Decimal(str(cat_total or 0))
        cat_booked_dec = Decimal(str(cat_booked or 0))
        cat_estimated_dec = Decimal(str(cat_estimated or 0))

        total_spent += cat_spent
        booked_amount += cat_booked_dec
        estimated_amount += cat_estimated_dec

        # Calculate percentage (based on total budget if available)
        cat_percentage = 0.0
        if total_budget and total_budget > 0:
            # Simple percentage of total budget
            cat_percentage = float(cat_spent / total_budget * 100)

        # Determine category status
        cat_status = _get_status(cat_percentage, warning_threshold, danger_threshold)

        by_category.append(
            schemas.CategoryBudget(
                category=cat_name,
                spent=cat_spent,
                booked=cat_booked_dec,
                estimated=cat_estimated_dec,
                percentage=round(cat_percentage, 1),
                status=cat_status,
            )
        )

    # Sort categories by spent amount (descending)
    by_category.sort(key=lambda x: x.spent, reverse=True)

    # Calculate overall percentage
    percentage_used = 0.0
    remaining = Decimal("0")
    if total_budget and total_budget > 0:
        percentage_used = float(total_spent / total_budget * 100)
        remaining = total_budget - total_spent
    else:
        remaining = -total_spent  # No budget set, show negative

    # Determine overall status
    status = _get_status(percentage_used, warning_threshold, danger_threshold)

    # Generate alerts
    alerts = _generate_alerts(
        total_budget=total_budget,
        total_spent=total_spent,
        percentage_used=percentage_used,
        by_category=by_category,
        warning_threshold=warning_threshold,
        danger_threshold=danger_threshold,
    )

    return schemas.BudgetStatusResponse(
        total_budget=total_budget,
        total_spent=total_spent,
        booked_amount=booked_amount,
        estimated_amount=estimated_amount,
        percentage_used=round(percentage_used, 1),
        remaining=remaining,
        status=status,
        by_category=by_category,
        alerts=alerts,
        warning_threshold=warning_threshold,
        danger_threshold=danger_threshold,
    )


def _get_status(
    percentage: float,
    warning_threshold: int,
    danger_threshold: int,
) -> schemas.BudgetStatus:
    """Determine budget status based on percentage used."""
    if percentage > 100:
        return "over"
    elif percentage >= danger_threshold:
        return "danger"
    elif percentage >= warning_threshold:
        return "warning"
    return "normal"


def _generate_alerts(
    total_budget: Optional[Decimal],
    total_spent: Decimal,
    percentage_used: float,
    by_category: list[schemas.CategoryBudget],
    warning_threshold: int,
    danger_threshold: int,
) -> list[schemas.BudgetAlert]:
    """Generate budget alerts based on current status."""
    alerts = []

    # Overall budget alerts
    if total_budget and total_budget > 0:
        if percentage_used > 100:
            over_amount = total_spent - total_budget
            alerts.append(
                schemas.BudgetAlert(
                    type="over_budget",
                    message=f"Over budget by ${over_amount:.2f}",
                    amount=over_amount,
                    percentage=round(percentage_used, 1),
                )
            )
        elif percentage_used >= danger_threshold:
            remaining = total_budget - total_spent
            alerts.append(
                schemas.BudgetAlert(
                    type="approaching_limit",
                    message=f"Almost at budget limit! Only ${remaining:.2f} remaining",
                    amount=remaining,
                    percentage=round(percentage_used, 1),
                )
            )
        elif percentage_used >= warning_threshold:
            remaining = total_budget - total_spent
            alerts.append(
                schemas.BudgetAlert(
                    type="approaching_limit",
                    message=f"Approaching budget limit. ${remaining:.2f} remaining",
                    amount=remaining,
                    percentage=round(percentage_used, 1),
                )
            )

    # Category-specific alerts (for categories over their proportional share)
    # This is a simple heuristic - categories using more than 25% of total budget
    if total_budget and total_budget > 0:
        for cat in by_category:
            if cat.percentage > 25:  # More than 25% in one category
                alerts.append(
                    schemas.BudgetAlert(
                        type="over_category",
                        message=f"{cat.category.title()} is using {cat.percentage:.0f}% of your total budget",
                        category=cat.category,
                        amount=cat.spent,
                        percentage=cat.percentage,
                    )
                )

    return alerts


def check_expense_impact(
    trip_id: int,
    expense_amount: Decimal,
    db: Session,
) -> Optional[dict]:
    """
    Check if adding an expense would exceed the budget.

    Returns alert info if over budget, None otherwise.
    """
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip or not trip.budget:
        return None

    total_budget = Decimal(str(trip.budget))

    # Get current total
    current_total = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.trip_id == trip_id)
        .scalar()
    )
    current_total = Decimal(str(current_total or 0))

    new_total = current_total + expense_amount

    if new_total > total_budget:
        over_by = new_total - total_budget
        return {
            "would_exceed": True,
            "over_by": float(over_by),
            "new_total": float(new_total),
            "budget": float(total_budget),
            "percentage": float(new_total / total_budget * 100),
        }

    return None
