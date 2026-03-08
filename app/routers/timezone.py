"""
app/routers/timezone.py - Timezone lookup from coordinates

Uses timezonefinder (offline, no API key) to resolve an IANA timezone
string from a lat/lng pair. Returns null for ocean coordinates.
"""

from fastapi import APIRouter, Depends, Query
from timezonefinder import TimezoneFinder as _TF

from app.core.deps import get_current_user
from app import models

router = APIRouter(prefix="/timezone", tags=["timezone"])

# Single shared instance — TimezoneFinder loads ~20MB of data once at import
_tf = _TF()


@router.get("/")
def get_timezone(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    _: models.User = Depends(get_current_user),
):
    """Return the IANA timezone for the given coordinates, or null for ocean."""
    timezone = _tf.timezone_at(lat=lat, lng=lng)
    return {"timezone": timezone}
