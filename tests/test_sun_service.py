"""
tests/test_sun_service.py - Pure unit tests for the sunset calculator.

Asserts against known almanac values with ±2 minute tolerance.
No database, no mocking, no freezegun — ``get_sunset`` takes an
explicit date parameter.

Author: Travel Planner Team
"""

import datetime
from zoneinfo import ZoneInfo

from app.services.sun_service import get_sunset


def _assert_within_minutes(
    actual: datetime.datetime,
    expected_h: int,
    expected_m: int,
    tz_name: str,
    tolerance_min: int = 2,
) -> None:
    """Assert *actual* is within *tolerance_min* of *expected_h:expected_m*."""
    tz = ZoneInfo(tz_name)
    expected = actual.replace(
        hour=expected_h, minute=expected_m, second=0, microsecond=0
    )
    # Ensure both are in the same timezone
    actual_local = actual.astimezone(tz)
    expected_local = expected.astimezone(tz)
    diff = abs((actual_local - expected_local).total_seconds())
    assert diff <= tolerance_min * 60, (
        f"Expected ~{expected_h:02d}:{expected_m:02d} {tz_name}, "
        f"got {actual_local.strftime('%H:%M:%S')}, "
        f"diff={diff / 60:.1f} min (tolerance={tolerance_min} min)"
    )


# ---------------------------------------------------------------------------
# 1. Moab, Utah — 2026-09-11 (the Southwest trip reference date)
# ---------------------------------------------------------------------------


def test_moab_sunset_sept_11():
    """Moab sunset on 2026-09-11 should be ~19:32 MDT."""
    sunset = get_sunset(
        latitude=38.57,
        longitude=-109.55,
        date=datetime.date(2026, 9, 11),
        timezone="America/Denver",
    )
    assert sunset.tzinfo is not None
    _assert_within_minutes(sunset, 19, 32, "America/Denver")


# ---------------------------------------------------------------------------
# 2. Grand Canyon South Rim — 2026-09-11
# ---------------------------------------------------------------------------


def test_grand_canyon_sunset_sept_11():
    """Grand Canyon sunset on 2026-09-11 should be ~18:41 MST.

    Arizona (America/Phoenix) does not observe DST.
    """
    sunset = get_sunset(
        latitude=36.06,
        longitude=-112.14,
        date=datetime.date(2026, 9, 11),
        timezone="America/Phoenix",
    )
    assert sunset.tzinfo is not None
    _assert_within_minutes(sunset, 18, 41, "America/Phoenix")


# ---------------------------------------------------------------------------
# 3. Reykjavik, Iceland — 2026-06-21 (summer solstice, near-midnight sun)
# ---------------------------------------------------------------------------


def test_reykjavik_sunset_summer_solstice():
    """Reykjavik near solstice: astral raises ValueError because the sun
    never dips far enough below the horizon for a standard sunrise/sunset
    calculation at 64°N in late June.

    This is a known edge case — the scheduler's except clause in the
    daylight check handles it gracefully (skips warning). We verify
    the error is raised so the scheduler's resilience is exercised.
    """
    import pytest

    with pytest.raises(ValueError, match="Sun never reaches"):
        get_sunset(
            latitude=64.13,
            longitude=-21.90,
            date=datetime.date(2026, 6, 21),
            timezone="Atlantic/Reykjavik",
        )


# ---------------------------------------------------------------------------
# 4. London, UK — 2026-12-21 (winter solstice, early sunset)
# ---------------------------------------------------------------------------


def test_london_sunset_winter_solstice():
    """London sunset on 2026-12-21 should be ~15:53 GMT."""
    sunset = get_sunset(
        latitude=51.51,
        longitude=-0.13,
        date=datetime.date(2026, 12, 21),
        timezone="Europe/London",
    )
    assert sunset.tzinfo is not None
    _assert_within_minutes(sunset, 15, 53, "Europe/London")


# ---------------------------------------------------------------------------
# 5. Return type is timezone-aware
# ---------------------------------------------------------------------------


def test_sunset_is_timezone_aware():
    """get_sunset always returns a timezone-aware datetime."""
    sunset = get_sunset(
        latitude=40.71,
        longitude=-74.01,
        date=datetime.date(2026, 7, 4),
        timezone="America/New_York",
    )
    assert sunset.tzinfo is not None
    # Should be in the requested timezone
    local = sunset.astimezone(ZoneInfo("America/New_York"))
    # July 4 in NYC: sunset around 20:30 EDT, definitely after 19:00
    assert local.hour >= 19, f"NYC July sunset too early: {local.strftime('%H:%M')}"
