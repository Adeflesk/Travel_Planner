"""
app/services/sun_service.py - Sunset calculator (pure function)

Uses the ``astral`` library to compute sunset for a given location and date.
No database access, no side effects — safe to call from the scheduler or
anywhere else.

Author: Travel Planner Team
"""

from __future__ import annotations

import datetime
from zoneinfo import ZoneInfo

from astral import LocationInfo
from astral.sun import sun


def get_sunset(
    latitude: float,
    longitude: float,
    date: datetime.date,
    timezone: str,
) -> datetime.datetime:
    """Return the sunset datetime for *date* at (*latitude*, *longitude*).

    The returned datetime is timezone-aware in the given IANA *timezone*.
    """
    tz = ZoneInfo(timezone)
    loc = LocationInfo(
        name="stop",
        region="",
        timezone=timezone,
        latitude=latitude,
        longitude=longitude,
    )
    s = sun(loc.observer, date=date, tzinfo=tz)
    return s["sunset"]
