"""
app/routers/health.py - Health check router

Provides a simple health check endpoint.

Author: Travel Planner Team
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy"}
