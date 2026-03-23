"""
app/core/http.py - Timed HTTP helper for external API calls

Wraps httpx.get/post with elapsed-time logging so every external call
is automatically instrumented.
"""

import logging
import time

import httpx

logger = logging.getLogger(__name__)


def timed_get(
    url: str,
    *,
    service: str = "",
    timeout: float = 5.0,
    **kwargs,
) -> httpx.Response:
    """
    httpx.get with automatic timing and logging.

    *service* is a human-readable label (e.g. "exchange-rate", "mapbox").
    On success logs at INFO; on failure logs at WARNING before re-raising.
    """
    label = service or url
    t0 = time.monotonic()
    try:
        response = httpx.get(url, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.info(
            "%s %s %d (%.0fms)",
            label,
            "GET",
            response.status_code,
            elapsed_ms,
        )
        return response
    except Exception as exc:
        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.warning(
            "%s GET failed: %s (%.0fms)",
            label,
            exc,
            elapsed_ms,
        )
        raise


def timed_post(
    url: str,
    *,
    service: str = "",
    timeout: float = 10.0,
    **kwargs,
) -> httpx.Response:
    """httpx.post with automatic timing and logging."""
    label = service or url
    t0 = time.monotonic()
    try:
        response = httpx.post(url, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.info(
            "%s %s %d (%.0fms)",
            label,
            "POST",
            response.status_code,
            elapsed_ms,
        )
        return response
    except Exception as exc:
        elapsed_ms = (time.monotonic() - t0) * 1000
        logger.warning(
            "%s POST failed: %s (%.0fms)",
            label,
            exc,
            elapsed_ms,
        )
        raise
