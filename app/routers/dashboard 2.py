"""
app/routers/dashboard.py - Dashboard endpoints router

Aggregated dashboard data for authenticated users.

Author: Travel Planner Team
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.services.dashboard_service import get_dashboard_data
from database import get_db

router = APIRouter()


@router.get("/api/dashboard", response_model=schemas.DashboardData, tags=["dashboard"])
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_dashboard_data(db, current_user)
