"""
app/routers/suggestions.py - Suggestion endpoints router

Provides autocomplete suggestions based on user's historical data.
All endpoints require authentication.

Author: Travel Planner Team
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app import models
from app.core.deps import get_current_user
from database import get_db
from pydantic import BaseModel


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
    """Get carrier/airline name suggestions based on user's transport history."""

    # Get recent carriers (ordered by most recent - using ID as proxy for recency)
    recent_query = (
        db.query(distinct(models.TripTransport.carrier))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.TripTransport.carrier.isnot(None),
            models.TripTransport.carrier != "",
        )
        .order_by(models.TripTransport.id.desc())
        .limit(3)
    )
    recent_carriers = [row[0] for row in recent_query.all()]

    # Get all unique carriers for suggestions
    all_carriers_query = (
        db.query(
            models.TripTransport.carrier,
            func.count(models.TripTransport.id).label("count"),
        )
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.TripTransport.carrier.isnot(None),
            models.TripTransport.carrier != "",
        )
        .group_by(models.TripTransport.carrier)
        .order_by(func.count(models.TripTransport.id).desc())
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
    """Get location suggestions from destinations and transport origins/destinations."""

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

    # Get transport origin/destination names
    transport_origins = (
        db.query(distinct(models.TripTransport.origin))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.TripTransport.origin.isnot(None),
            models.TripTransport.origin != "",
        )
        .all()
    )

    transport_destinations = (
        db.query(distinct(models.TripTransport.destination))
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.TripTransport.destination.isnot(None),
            models.TripTransport.destination != "",
        )
        .all()
    )

    # Combine and deduplicate
    all_locations = set()
    all_locations.update([row[0] for row in dest_names])
    all_locations.update([row[0] for row in transport_origins])
    all_locations.update([row[0] for row in transport_destinations])

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

    # Get activity title suggestions from user's trips
    user_trip_ids = (
        db.query(models.Trip.id)
        .filter(models.Trip.user_id == current_user.id)
        .subquery()
    )
    user_day_ids = (
        db.query(models.TripDay.id)
        .filter(models.TripDay.trip_id.in_(user_trip_ids))
        .subquery()
    )
    user_dest_ids = (
        db.query(models.Destination.id)
        .filter(models.Destination.trip_id.in_(user_trip_ids))
        .subquery()
    )
    activities_query = (
        db.query(
            models.DayActivity.title, func.count(models.DayActivity.id).label("count")
        )
        .filter(
            (models.DayActivity.day_id.in_(user_day_ids))
            | (models.DayActivity.destination_id.in_(user_dest_ids))
        )
        .filter(
            models.DayActivity.title.isnot(None),
            models.DayActivity.title != "",
        )
        .group_by(models.DayActivity.title)
        .order_by(func.count(models.DayActivity.id).desc())
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

    # Get currencies from transport
    transport_currencies = (
        db.query(
            models.TripTransport.currency,
            func.count(models.TripTransport.id).label("count"),
        )
        .join(models.Trip)
        .filter(
            models.Trip.user_id == current_user.id,
            models.TripTransport.currency.isnot(None),
            models.TripTransport.currency != "",
        )
        .group_by(models.TripTransport.currency)
        .order_by(func.count(models.TripTransport.id).desc())
        .all()
    )

    # Combine and count
    currency_counts = {}
    for currency, count in expense_currencies:
        currency_counts[currency] = currency_counts.get(currency, 0) + count
    for currency, count in transport_currencies:
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
