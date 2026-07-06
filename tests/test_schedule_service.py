"""
tests/test_schedule_service.py - Pure unit tests for the cascade scheduler.

No database, no fixtures — runs in milliseconds.
Covers the full edge-case checklist from the design doc.
"""

import datetime
from unittest.mock import patch

from app.services.schedule_service import (
    ScheduleInput,
    compute_schedule,
    DEFAULT_DURATION,
)


DAY = datetime.date(2026, 9, 11)  # Day 3 of the Southwest trip


def _ids(items):
    return [i.id for i in items]


def _codes(warnings):
    return [w.code for w in warnings]


# ---------------------------------------------------------------------------
# 1. Simple chain: durations + drives accumulate
# ---------------------------------------------------------------------------


def test_simple_chain():
    stops = [
        ScheduleInput(
            id=1, title="A", duration_minutes=30, drive_minutes_from_previous=20
        ),
        ScheduleInput(
            id=2, title="B", duration_minutes=45, drive_minutes_from_previous=15
        ),
    ]
    r = compute_schedule(stops, "08:00", DAY, "America/Phoenix")
    assert len(r.items) == 2
    # A: arrive 08:20, depart 08:50
    assert r.items[0].arrival_local == "08:20"
    assert r.items[0].departure_local == "08:50"
    # B: arrive 09:05, depart 09:50
    assert r.items[1].arrival_local == "09:05"
    assert r.items[1].departure_local == "09:50"
    assert r.warnings == []


# ---------------------------------------------------------------------------
# 2. Zero-duration stop (photo pull-off)
# ---------------------------------------------------------------------------


def test_zero_duration_stop():
    stops = [
        ScheduleInput(
            id=1, title="Photo", duration_minutes=0, drive_minutes_from_previous=10
        ),
    ]
    r = compute_schedule(stops, "09:00", DAY, "America/Phoenix")
    assert r.items[0].arrival_local == "09:10"
    assert r.items[0].departure_local == "09:10"  # zero duration
    assert r.items[0].duration_minutes == 0


# ---------------------------------------------------------------------------
# 3. Empty chain
# ---------------------------------------------------------------------------


def test_empty_chain():
    r = compute_schedule([], "07:00", DAY, "America/Phoenix")
    assert r.items == []
    assert r.warnings == []


# ---------------------------------------------------------------------------
# 4. Locked anchor with slack (plan is early)
# ---------------------------------------------------------------------------


def test_locked_anchor_with_slack():
    stops = [
        ScheduleInput(
            id=1,
            title="Tour",
            duration_minutes=90,
            drive_minutes_from_previous=30,
            locked_arrival_time="10:00",
        ),
    ]
    # Depart 08:00, drive 30 min → arrive 08:30, but locked to 10:00
    r = compute_schedule(stops, "08:00", DAY, "America/Phoenix")
    assert r.items[0].arrival_local == "10:00"
    assert r.items[0].slack_before_minutes == 90  # 10:00 - 08:30 = 90 min
    assert r.items[0].overrun_minutes == 0
    assert "overrun" not in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 5. Locked anchor with overrun — lock held, warning emitted
# ---------------------------------------------------------------------------


def test_locked_anchor_overrun():
    stops = [
        ScheduleInput(
            id=1,
            title="Tour",
            duration_minutes=90,
            drive_minutes_from_previous=150,  # 2.5 hours drive
            locked_arrival_time="10:00",
        ),
    ]
    # Depart 08:00 + 150 drive = arrive 10:30, but locked to 10:00
    r = compute_schedule(stops, "08:00", DAY, "America/Phoenix")
    assert r.items[0].arrival_local == "10:00"  # lock is HELD
    assert r.items[0].overrun_minutes == 30
    assert "overrun" in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 6. Locked anchor as the first item
# ---------------------------------------------------------------------------


def test_locked_first_item():
    stops = [
        ScheduleInput(
            id=1,
            title="Early start",
            duration_minutes=60,
            drive_minutes_from_previous=0,
            locked_arrival_time="07:00",
        ),
    ]
    r = compute_schedule(stops, "07:00", DAY, "America/Phoenix")
    assert r.items[0].arrival_local == "07:00"
    assert r.items[0].slack_before_minutes == 0
    assert r.items[0].overrun_minutes == 0


# ---------------------------------------------------------------------------
# 7. Timezone jump forward (MST → MDT)
# ---------------------------------------------------------------------------


def test_timezone_jump_forward():
    """Arizona (no DST) → Navajo/Denver (observes DST in Sept)."""
    stops = [
        ScheduleInput(
            id=1,
            title="In Arizona",
            duration_minutes=30,
            drive_minutes_from_previous=60,
            timezone="America/Phoenix",
        ),
        ScheduleInput(
            id=2,
            title="In Navajo Nation",
            duration_minutes=30,
            drive_minutes_from_previous=60,
            timezone="America/Denver",
        ),
    ]
    r = compute_schedule(stops, "12:00", DAY, "America/Phoenix")
    # Stop 1: drive 60 → arrive 13:00 MST, depart 13:30 MST
    assert r.items[0].arrival_local == "13:00"
    assert r.items[0].timezone == "America/Phoenix"

    # Stop 2: drive 60 min elapsed → 14:30 MST = 15:30 MDT (Denver is UTC-6 in Sept)
    # Phoenix is UTC-7 year-round; Denver is UTC-6 in Sept (DST)
    # So crossing: wall clock jumps +1 hour
    assert r.items[1].timezone == "America/Denver"
    # 13:30 MST depart + 60 min drive = 14:30 MST = 15:30 MDT
    assert r.items[1].arrival_local == "15:30"


# ---------------------------------------------------------------------------
# 8. Locked time interpreted in the stop's zone, not the day's
# ---------------------------------------------------------------------------


def test_locked_time_in_stops_zone():
    """Locked time 14:00 Denver (UTC-6) is different from 14:00 Phoenix (UTC-7)."""
    stops = [
        ScheduleInput(
            id=1,
            title="Denver stop",
            duration_minutes=30,
            drive_minutes_from_previous=0,
            locked_arrival_time="14:00",
            timezone="America/Denver",
        ),
    ]
    # Depart 12:00 Phoenix time
    r = compute_schedule(stops, "12:00", DAY, "America/Phoenix")
    # 12:00 MST (UTC-7) = 19:00 UTC
    # locked 14:00 MDT (UTC-6 in Sept) = 20:00 UTC
    # Slack = 60 min
    assert r.items[0].arrival_local == "14:00"
    assert r.items[0].timezone == "America/Denver"
    assert r.items[0].slack_before_minutes == 60


# ---------------------------------------------------------------------------
# 9. Missing duration / missing drive time → defaults + info warnings
# ---------------------------------------------------------------------------


def test_missing_duration_default():
    stops = [
        ScheduleInput(id=1, title="No dur", drive_minutes_from_previous=10),
    ]
    r = compute_schedule(stops, "09:00", DAY, "America/Phoenix")
    assert r.items[0].duration_minutes == DEFAULT_DURATION
    assert "missing_duration" in _codes(r.warnings)


def test_missing_drive_time_default():
    stops = [
        ScheduleInput(id=1, title="No drive", duration_minutes=15),
    ]
    r = compute_schedule(stops, "09:00", DAY, "America/Phoenix")
    assert r.items[0].drive_minutes_from_previous == 0
    assert "missing_drive_time" in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 10. Daylight warning fires on flag, silent without flag
# ---------------------------------------------------------------------------


def test_daylight_warning_fires():
    """Stop that requires daylight and ends after sunset gets a warning."""
    # Mock sunset to 18:00 so a stop ending at 19:00 triggers the warning
    fake_sunset = datetime.datetime(2026, 9, 11, 18, 0, tzinfo=datetime.timezone.utc)
    with patch("app.services.schedule_service.get_sunset", return_value=fake_sunset):
        stops = [
            ScheduleInput(
                id=1,
                title="Late stop",
                duration_minutes=60,
                drive_minutes_from_previous=0,
                requires_daylight=True,
                latitude=38.57,
                longitude=-109.55,
            ),
        ]
        r = compute_schedule(stops, "17:30", DAY, "UTC")
        assert "after_sunset" in _codes(r.warnings)


def test_daylight_silent_without_flag():
    """Stop without requires_daylight=True never gets after_sunset."""
    fake_sunset = datetime.datetime(2026, 9, 11, 18, 0, tzinfo=datetime.timezone.utc)
    with patch("app.services.schedule_service.get_sunset", return_value=fake_sunset):
        stops = [
            ScheduleInput(
                id=1,
                title="Late stop",
                duration_minutes=60,
                drive_minutes_from_previous=0,
                requires_daylight=False,
                latitude=38.57,
                longitude=-109.55,
            ),
        ]
        r = compute_schedule(stops, "17:30", DAY, "UTC")
        assert "after_sunset" not in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 11. day_end_target missed
# ---------------------------------------------------------------------------


def test_day_end_target_missed():
    stops = [
        ScheduleInput(
            id=1, title="Long stop", duration_minutes=120, drive_minutes_from_previous=0
        ),
    ]
    r = compute_schedule(
        stops,
        "18:00",
        DAY,
        "America/Phoenix",
        day_end_target="19:00",
    )
    # depart 18:00 + 0 drive + 120 dur = 20:00, misses 19:00
    assert "past_day_end" in _codes(r.warnings)


def test_day_end_target_met():
    stops = [
        ScheduleInput(
            id=1, title="Quick", duration_minutes=30, drive_minutes_from_previous=0
        ),
    ]
    r = compute_schedule(
        stops,
        "18:00",
        DAY,
        "America/Phoenix",
        day_end_target="19:00",
    )
    assert "past_day_end" not in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 12. Chain crossing midnight
# ---------------------------------------------------------------------------


def test_crosses_midnight():
    stops = [
        ScheduleInput(
            id=1,
            title="Late",
            duration_minutes=120,
            drive_minutes_from_previous=0,
        ),
    ]
    r = compute_schedule(stops, "23:00", DAY, "America/Phoenix")
    assert "crosses_midnight" in _codes(r.warnings)


# ---------------------------------------------------------------------------
# 13. Full Day-3 integration scenario (Grand Canyon → Moab)
# ---------------------------------------------------------------------------


def test_grand_canyon_to_moab_full_day():
    """Realistic multi-stop chain with timezone crossing."""
    stops = [
        ScheduleInput(
            id=1,
            title="Desert View Watchtower",
            duration_minutes=45,
            drive_minutes_from_previous=25,
            timezone="America/Phoenix",
        ),
        ScheduleInput(
            id=2,
            title="Antelope Canyon tour",
            duration_minutes=90,
            drive_minutes_from_previous=110,
            locked_arrival_time="10:00",
            timezone="America/Phoenix",
        ),
        ScheduleInput(
            id=3,
            title="Horseshoe Bend",
            duration_minutes=45,
            drive_minutes_from_previous=10,
            timezone="America/Phoenix",
        ),
        ScheduleInput(
            id=4,
            title="Lunch - Big John's",
            duration_minutes=45,
            drive_minutes_from_previous=5,
            timezone="America/Phoenix",
        ),
        ScheduleInput(
            id=5,
            title="Forrest Gump Point",
            duration_minutes=15,
            drive_minutes_from_previous=130,
            timezone="America/Denver",
        ),
        ScheduleInput(
            id=6,
            title="The View Hotel",
            duration_minutes=30,
            drive_minutes_from_previous=25,
            timezone="America/Denver",
        ),
        ScheduleInput(
            id=7,
            title="Arrive Moab",
            duration_minutes=0,
            drive_minutes_from_previous=160,
            timezone="America/Denver",
        ),
    ]

    r = compute_schedule(
        stops,
        "07:00",
        DAY,
        "America/Phoenix",
        day_end_target="19:30",
    )

    assert len(r.items) == 7

    # Desert View: 07:00 + 25 drive = 07:25 arrive
    assert r.items[0].arrival_local == "07:25"

    # Antelope Canyon: locked 10:00, plan arrives after 08:10 + 110 = 10:00
    # 07:25 + 45 dur = 08:10 depart, +110 drive = 10:00 arrive — exactly on time
    assert r.items[1].arrival_local == "10:00"
    assert r.items[1].overrun_minutes == 0

    # Forrest Gump Point is in MDT — wall clock should jump +1 hour
    assert r.items[4].timezone == "America/Denver"

    # No overrun warnings expected
    overrun_warnings = [w for w in r.warnings if w.code == "overrun"]
    assert len(overrun_warnings) == 0
