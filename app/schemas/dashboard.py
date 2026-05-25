"""
app/schemas/dashboard.py - Dashboard Pydantic schemas

Defines schemas for the dashboard aggregate endpoint.

Author: Travel Planner Team
"""

from typing import List, Literal, Optional

from pydantic import BaseModel


class DashboardUser(BaseModel):
    name: str


class DashboardNextTrip(BaseModel):
    id: int
    name: str
    start_date: str
    days_until: int
    destinations: List[str]
    budget_used: float
    budget_total: float
    budget_currency: str = "USD"


class DashboardStats(BaseModel):
    total_trips: int
    countries_visited: int
    spent_this_year: float
    upcoming_trips: int
    preferred_currency: str = "USD"


ActionItemType = Literal[
    "booking", "packing", "budget", "deadline", "pre_trip_task", "activity_deadline"
]
ActionItemUrgency = Literal["low", "medium", "high"]


class DashboardActionItem(BaseModel):
    type: ActionItemType
    title: str
    trip_name: str
    trip_id: int
    urgency: ActionItemUrgency
    detail: str
    day_id: Optional[int] = None


class DashboardRecentTrip(BaseModel):
    id: int
    name: str
    dates: str
    status: Literal["completed", "in_progress"]
    country_code: Optional[str] = None


class DashboardData(BaseModel):
    user: DashboardUser
    next_trip: Optional[DashboardNextTrip]
    stats: DashboardStats
    action_items: List[DashboardActionItem]
    recent_trips: List[DashboardRecentTrip]
