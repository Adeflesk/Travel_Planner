"""
app/main.py - FastAPI application factory

Creates the FastAPI app, configures middleware, and includes routers from
`app.routers`.

Author: Travel Planner Team
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.rate_limit import limiter
from app.core.migrations import run_migrations
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
    journey_stops_router,
    stop_options_router,
    journey_documents_router,
    dashboard_router,
)
import models
from database import engine

# Ensure tables exist (kept for compatibility)
models.Base.metadata.create_all(bind=engine)

# Run migrations to add any missing columns to existing databases
run_migrations(engine)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


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

    # Register rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

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
    app.include_router(journey_stops_router)
    app.include_router(stop_options_router)
    app.include_router(journey_documents_router)
    app.include_router(dashboard_router)

    return app


app = create_app()
