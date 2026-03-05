"""
app/services/geocoding.py - Mapbox geocoding service

Geocodes a location string to (lat, lng) coordinates.
Returns None on any failure — geocoding must never block a save.
"""

import logging
import os
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"


def geocode(query: str) -> tuple[float, float] | None:
    """
    Geocode a location string using Mapbox Geocoding API v5.

    Returns (lat, lng) on success, None on any failure.
    Never raises — callers should proceed with null coords if this returns None.
    """
    token = (os.getenv("MAPBOX_TOKEN") or "").strip()
    if not token:
        logger.warning("MAPBOX_TOKEN not set — geocoding skipped")
        return None

    if not query or not query.strip():
        return None

    try:
        url = MAPBOX_GEOCODING_URL.format(query=quote(query))
        response = httpx.get(
            url,
            params={
                "access_token": token,
                "limit": 1,
                "types": "place,address,poi",
            },
            timeout=5.0,
        )
        if response.status_code != 200:
            logger.warning(
                "Mapbox geocoding returned %d for query: %s",
                response.status_code,
                query,
            )
            return None

        data = response.json()
        features = data.get("features", [])
        if not features:
            return None

        # Mapbox returns [longitude, latitude] — we store (lat, lng)
        lng, lat = features[0]["center"]
        return (lat, lng)

    except Exception as e:
        logger.warning("Geocoding failed for %r: %s", query, e)
        return None
