"""
app/main.py - FastAPI application factory

Creates the FastAPI app, configures middleware, and includes routers from
`app.routers`.

Author: Travel Planner Team
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    health_router,
    auth_router,
    admin_router,
    trips_router,
    destinations_router,
    activities_router,
    expenses_router,
    packing_router,
    journeys_router,
)
import models
from database import engine

# Ensure tables exist (kept for compatibility)
models.Base.metadata.create_all(bind=engine)


def get_cors_origins() -> list[str]:
    """Get allowed CORS origins from environment or defaults."""
    # Default development origins
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Add production frontend URL if configured
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        origins.append(frontend_url)

    # Add additional origins from comma-separated env var
    extra_origins = os.getenv("CORS_ORIGINS", "")
    if extra_origins:
        origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

    return origins


def create_app() -> FastAPI:
    app = FastAPI(
        title="Travel Planner API",
        version="1.0.0",
        docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
        redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(trips_router)
    app.include_router(destinations_router)
    app.include_router(activities_router)
    app.include_router(expenses_router)
    app.include_router(packing_router)
    app.include_router(journeys_router)

    return app


app = create_app()
