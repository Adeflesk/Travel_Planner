"""
app/main.py - FastAPI application factory

Creates the FastAPI app, configures middleware, and includes routers from
`app.routers`.

Author: Travel Planner Team
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in project root
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
load_dotenv(dotenv_path=env_path)

from contextlib import asynccontextmanager  # noqa: E402
from apscheduler.schedulers.background import BackgroundScheduler  # noqa: E402
from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.core.migrations import run_migrations  # noqa: E402
from app.routers import (  # noqa: E402
    health_router,
    auth_router,
    admin_router,
    trips_router,
    destinations_router,
    activities_router,
    expenses_router,
    packing_router,
    dashboard_router,
    suggestions_router,
    trip_days_router,
    settings_router,
    trip_transports_router,
    transport_options_router,
    accommodations_router,
    exchange_rates_router,
    timezone_router,
    rate_history_router,
)
from app import models  # noqa: E402
from database import engine  # noqa: E402

# Database initialization wrapped in try-except to prevent startup failure
try:
    # Ensure tables exist (kept for compatibility)
    models.Base.metadata.create_all(bind=engine)

    # Run migrations to add any missing columns to existing databases
    run_migrations(engine)
except Exception as e:
    import logging

    logging.error(f"Error during database initialization: {e}")
    # We don't re-raise here to allow the app to start and serve health checks
    # if it's a transient database issue.


_scheduler = BackgroundScheduler()


def _run_reminders_job() -> None:
    """APScheduler job: open a DB session, run reminders, close it."""
    from database import SessionLocal
    from app.services.reminder_service import send_due_reminders

    db = SessionLocal()
    try:
        send_due_reminders(db)
    except Exception as e:
        import logging

        logging.getLogger(__name__).error("Reminder job failed: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _scheduler.add_job(_run_reminders_job, "cron", hour=8, minute=0, timezone="UTC")
    _scheduler.start()
    yield
    _scheduler.shutdown()


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
        "https://travel-planner-one-weld.vercel.app",
        "https://travel-planner-one.vercel.app",
    ]

    # Add production frontend URL if configured
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        # Avoid duplicates and handle comma-separated values
        for url in frontend_url.split(","):
            url = url.strip()
            if url and url not in origins:
                origins.append(url)

    # Add additional origins from comma-separated env var
    extra_origins = os.getenv("CORS_ORIGINS", "")
    if extra_origins:
        for o in extra_origins.split(","):
            o = o.strip()
            if o and o not in origins:
                origins.append(o)

    return origins


def create_app() -> FastAPI:
    app = FastAPI(
        title="Travel Planner API",
        version="1.0.0",
        lifespan=_lifespan,
        docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
        redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    )

    # Register rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_origin_regex=r"https://.*\.vercel\.app",  # Support Vercel previews
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
    app.include_router(dashboard_router)
    app.include_router(suggestions_router)
    app.include_router(trip_days_router)
    app.include_router(settings_router)
    app.include_router(trip_transports_router)
    app.include_router(transport_options_router)
    app.include_router(accommodations_router)
    app.include_router(exchange_rates_router)
    app.include_router(timezone_router)
    app.include_router(rate_history_router)

    return app


app = create_app()
