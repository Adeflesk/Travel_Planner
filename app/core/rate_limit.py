"""
app/core/rate_limit.py - Rate limiting configuration.

Provides the rate limiter instance for use across the application.
Rate limiting can be disabled by setting RATE_LIMIT_ENABLED=false.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def get_rate_limit_enabled() -> bool:
    """Check if rate limiting is enabled (disabled for tests)."""
    return os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"


# Rate limiter instance (shared across the app)
# Uses client IP address as the key for rate limiting
# Disabled when RATE_LIMIT_ENABLED=false (e.g., in tests)
limiter = Limiter(
    key_func=get_remote_address,
    enabled=get_rate_limit_enabled(),
)
