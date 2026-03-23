"""
app/core/logging_config.py - Centralized logging configuration

Call ``setup_logging()`` once at application startup (before any other
imports that create loggers) to apply a consistent format and level
across the entire backend.
"""

import logging
import os


def setup_logging() -> None:
    """Configure root logger with a consistent format and level."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=level,
        force=True,  # override any prior basicConfig calls
    )

    # Quiet noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
