"""
app/routers/suggestions.py - Suggestion endpoints router

Provides autocomplete suggestions based on user's historical data.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user
from database import get_db


class SuggestionResponse(BaseModel):
    """Response model for suggestions."""

    suggestions: List[str]
    recent: Optional[List[str]] = None
    popular: Optional[List[str]] = None


router = APIRouter()


@router.get(
    "/api/suggestions/carriers", response_model=SuggestionResponse, tags=["suggestions"]
)
def get_carrier_suggestions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get carrier/airline name suggestions based on user's journey history."""

    # Get recent carriers (ordered by most recent - using ID as proxy for recency)
    recent_query = (
        db.query(distinct(models.Journey.carrier))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Journey.carrier.isnot(None),
            models.Journey.carrier != "",
        )
        .order_by(models.Journey.id.desc())
        .limit(3)
    )
    recent_carriers = [row[0] for row in recent_query.all()]

    # Get all unique carriers for suggestions
    all_carriers_query = (
        db.query(models.Journey.carrier, func.count(models.Journey.id).label("count"))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Journey.carrier.isnot(None),
            models.Journey.carrier != "",
        )
        .group_by(models.Journey.carrier)
        .order_by(func.count(models.Journey.id).desc())
        .limit(limit)
    )
    all_carriers = [row[0] for row in all_carriers_query.all()]

    # Popular carriers are the most frequently used
    popular_carriers = [c for c in all_carriers if c not in recent_carriers][:3]

    return SuggestionResponse(
        suggestions=all_carriers,
        recent=recent_carriers if recent_carriers else None,
        popular=popular_carriers if popular_carriers else None,
    )


@router.get(
    "/api/suggestions/locations",
    response_model=SuggestionResponse,
    tags=["suggestions"],
)
def get_location_suggestions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get location suggestions from destinations and journey origins/destinations."""

    # Get destination names
    dest_names = (
        db.query(distinct(models.Destination.name))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Destination.name.isnot(None),
            models.Destination.name != "",
        )
        .all()
    )

    # Get journey origin/destination names (free text)
    journey_origins = (
        db.query(distinct(models.Journey.origin_name))
        .filter(
            models.Journey.user_id == current_user.id,
            models.Journey.origin_name.isnot(None),
            models.Journey.origin_name != "",
        )
        .all()
    )

    journey_destinations = (
        db.query(distinct(models.Journey.destination_name))
        .filter(
            models.Journey.user_id == current_user.id,
            models.Journey.destination_name.isnot(None),
            models.Journey.destination_name != "",
        )
        .all()
    )

    # Combine and deduplicate
    all_locations = set()
    all_locations.update([row[0] for row in dest_names])
    all_locations.update([row[0] for row in journey_origins])
    all_locations.update([row[0] for row in journey_destinations])

    # Convert to sorted list (alphabetically)
    location_list = sorted(list(all_locations))[:limit]

    return SuggestionResponse(suggestions=location_list)


@router.get(
    "/api/suggestions/expense-descriptions",
    response_model=SuggestionResponse,
    tags=["suggestions"],
)
def get_expense_description_suggestions(
    category: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get expense description suggestions, optionally filtered by category."""

    # Build query
    query = (
        db.query(
            models.Expense.description, func.count(models.Expense.id).label("count")
        )
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Expense.description.isnot(None),
            models.Expense.description != "",
        )
    )

    # Filter by category if provided
    if category:
        query = query.filter(models.Expense.category == category)

    # Group and order by frequency
    descriptions_query = (
        query.group_by(models.Expense.description)
        .order_by(func.count(models.Expense.id).desc())
        .limit(limit)
    )

    descriptions = [row[0] for row in descriptions_query.all()]

    return SuggestionResponse(suggestions=descriptions)


@router.get(
    "/api/suggestions/activity-names",
    response_model=SuggestionResponse,
    tags=["suggestions"],
)
def get_activity_name_suggestions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get activity name suggestions from user's activity history."""

    # Get activity names ordered by frequency
    activities_query = (
        db.query(models.Activity.name, func.count(models.Activity.id).label("count"))
        .join(models.Destination)
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Activity.name.isnot(None),
            models.Activity.name != "",
        )
        .group_by(models.Activity.name)
        .order_by(func.count(models.Activity.id).desc())
        .limit(limit)
    )

    activity_names = [row[0] for row in activities_query.all()]

    return SuggestionResponse(suggestions=activity_names)


@router.get(
    "/api/suggestions/packing-items",
    response_model=SuggestionResponse,
    tags=["suggestions"],
)
def get_packing_item_suggestions(
    category: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get packing item suggestions, optionally filtered by category."""

    # Common default items by category
    common_defaults = {
        "Clothing": ["T-Shirt", "Jeans", "Underwear", "Socks", "Jacket"],
        "Toiletries": ["Toothbrush", "Toothpaste", "Shampoo", "Soap", "Deodorant"],
        "Electronics": [
            "Phone Charger",
            "Laptop",
            "Camera",
            "Power Bank",
            "Headphones",
        ],
        "Documents": ["Passport", "Tickets", "Hotel Confirmation", "Travel Insurance"],
        "Health": ["Medication", "First Aid Kit", "Sunscreen", "Hand Sanitizer"],
        "Other": ["Snacks", "Water Bottle", "Umbrella", "Backpack"],
    }

    # Build query for user's historical items
    query = (
        db.query(
            models.PackingItem.item_name,
            func.count(models.PackingItem.id).label("count"),
        )
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.PackingItem.item_name.isnot(None),
            models.PackingItem.item_name != "",
        )
    )

    # Filter by category if provided
    if category:
        query = query.filter(models.PackingItem.category == category)

    # Get user's items
    user_items_query = (
        query.group_by(models.PackingItem.item_name)
        .order_by(func.count(models.PackingItem.id).desc())
        .limit(limit)
    )

    user_items = [row[0] for row in user_items_query.all()]

    # Add common defaults for the category
    suggestions = user_items.copy()
    if category and category in common_defaults:
        for default_item in common_defaults[category]:
            if default_item not in suggestions and len(suggestions) < limit:
                suggestions.append(default_item)

    return SuggestionResponse(suggestions=suggestions[:limit])


@router.get(
    "/api/suggestions/currencies",
    response_model=SuggestionResponse,
    tags=["suggestions"],
)
def get_currency_suggestions(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get currency suggestions based on user's expense and journey history."""

    # Get currencies from expenses
    expense_currencies = (
        db.query(models.Expense.currency, func.count(models.Expense.id).label("count"))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Expense.currency.isnot(None),
            models.Expense.currency != "",
        )
        .group_by(models.Expense.currency)
        .order_by(func.count(models.Expense.id).desc())
        .all()
    )

    # Get currencies from journeys
    journey_currencies = (
        db.query(models.Journey.currency, func.count(models.Journey.id).label("count"))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.Journey.currency.isnot(None),
            models.Journey.currency != "",
        )
        .group_by(models.Journey.currency)
        .order_by(func.count(models.Journey.id).desc())
        .all()
    )

    # Combine and count
    currency_counts = {}
    for currency, count in expense_currencies:
        currency_counts[currency] = currency_counts.get(currency, 0) + count
    for currency, count in journey_currencies:
        currency_counts[currency] = currency_counts.get(currency, 0) + count

    # Sort by total count
    sorted_currencies = sorted(
        currency_counts.items(), key=lambda x: x[1], reverse=True
    )
    currency_list = [currency for currency, _ in sorted_currencies[:limit]]

    # Add common defaults if user has no history
    common_currencies = ["USD", "EUR", "GBP"]
    for currency in common_currencies:
        if currency not in currency_list and len(currency_list) < limit:
            currency_list.append(currency)

    return SuggestionResponse(suggestions=currency_list[:limit])
