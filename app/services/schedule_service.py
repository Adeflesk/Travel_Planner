"""
app/services/schedule_service.py - Cascade scheduler (pure functions)

Forward-cascades ETAs through a chain of stops, enforcing locked anchors,
computing timezone-correct wall-clock labels, and emitting advisory warnings.

**No ``Session``, no FastAPI types — plain dataclasses in and out.**

Warning codes (public contract — add, never rename):

    overrun          plan is late into a locked anchor by N min
    after_sunset     daylight-flagged stop ends after sunset
    past_day_end     final arrival misses the target time
    missing_duration duration unset; default assumed
    missing_drive_time  drive time unset; 0 assumed
    crosses_midnight chain spills into the next date

Author: Travel Planner Team
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from zoneinfo import ZoneInfo

from app.services.sun_service import get_sunset

# ---------------------------------------------------------------------------
# Input / output dataclasses
# ---------------------------------------------------------------------------

DEFAULT_DURATION = 30  # minutes, when duration_minutes is None


@dataclass
class ScheduleInput:
    """One stop in the chain fed to ``compute_schedule``."""

    id: int
    title: str
    duration_minutes: int | None = None
    drive_minutes_from_previous: int | None = None
    locked_arrival_time: str | None = None  # "HH:MM"
    timezone: str | None = None  # IANA
    latitude: float | None = None
    longitude: float | None = None
    requires_daylight: bool = False


@dataclass
class ScheduleWarning:
    """Advisory warning emitted by the scheduler."""

    code: str
    stop_id: int | None = None
    message: str = ""


@dataclass
class ScheduleItemResult:
    """Computed times for one stop."""

    id: int
    title: str
    arrival_utc: datetime.datetime
    departure_utc: datetime.datetime
    arrival_local: str  # "HH:MM"
    departure_local: str  # "HH:MM"
    timezone: str
    duration_minutes: int
    drive_minutes_from_previous: int
    slack_before_minutes: int = 0
    overrun_minutes: int = 0


@dataclass
class ScheduleResult:
    """Full schedule returned by ``compute_schedule``."""

    items: list[ScheduleItemResult] = field(default_factory=list)
    warnings: list[ScheduleWarning] = field(default_factory=list)
    day_start: datetime.datetime | None = None
    day_end: datetime.datetime | None = None
    sunset: datetime.datetime | None = None


# ---------------------------------------------------------------------------
# Pure scheduler
# ---------------------------------------------------------------------------


def compute_schedule(
    stops: list[ScheduleInput],
    departure_time: str,  # "HH:MM"
    day_date: datetime.date,
    default_timezone: str,
    day_end_target: str | None = None,  # "HH:MM"
    sunset_coords: tuple[float, float] | None = None,  # (lat, lon) for last stop
) -> ScheduleResult:
    """Cascade-schedule *stops* starting at *departure_time* on *day_date*.

    The cursor advances in UTC. Each stop's optional ``timezone`` sets the
    display zone from that stop onward.  Locked anchors are held — if the
    plan arrives late, an ``overrun`` warning is emitted but the locked
    time is kept (a booked tour won't wait).

    Returns a :class:`ScheduleResult` with per-stop times and advisory
    warnings.
    """
    result = ScheduleResult()

    if not stops:
        return result

    warnings: list[ScheduleWarning] = []

    # --- Establish the starting cursor (UTC) ---
    current_tz_name = default_timezone
    current_tz = ZoneInfo(current_tz_name)
    dep_h, dep_m = (int(x) for x in departure_time.split(":"))
    cursor_utc = datetime.datetime(
        day_date.year,
        day_date.month,
        day_date.day,
        dep_h,
        dep_m,
        tzinfo=current_tz,
    ).astimezone(datetime.timezone.utc)

    result.day_start = cursor_utc

    for stop in stops:
        # Resolve timezone: stop's own zone, or carry forward
        if stop.timezone:
            current_tz_name = stop.timezone
            current_tz = ZoneInfo(current_tz_name)

        # --- Drive time ---
        drive_min = stop.drive_minutes_from_previous
        if drive_min is None:
            drive_min = 0
            warnings.append(
                ScheduleWarning(
                    code="missing_drive_time",
                    stop_id=stop.id,
                    message=f"Drive time to '{stop.title}' not set; assuming 0 min",
                )
            )

        cursor_utc += datetime.timedelta(minutes=drive_min)

        # --- Locked anchor handling ---
        slack = 0
        overrun = 0
        if stop.locked_arrival_time:
            lock_h, lock_m = (int(x) for x in stop.locked_arrival_time.split(":"))
            locked_local = datetime.datetime(
                day_date.year,
                day_date.month,
                day_date.day,
                lock_h,
                lock_m,
                tzinfo=current_tz,
            )
            locked_utc = locked_local.astimezone(datetime.timezone.utc)

            diff_minutes = int((locked_utc - cursor_utc).total_seconds() / 60)
            if diff_minutes > 0:
                # Plan is early — slack time
                slack = diff_minutes
                cursor_utc = locked_utc
            elif diff_minutes < 0:
                # Plan is late — overrun; hold the locked time
                overrun = -diff_minutes
                warnings.append(
                    ScheduleWarning(
                        code="overrun",
                        stop_id=stop.id,
                        message=(
                            f"Plan arrives {overrun} min late to "
                            f"locked stop '{stop.title}'"
                        ),
                    )
                )
                cursor_utc = locked_utc
            # else: exactly on time, cursor stays

        arrival_utc = cursor_utc

        # --- Duration ---
        dur = stop.duration_minutes
        if dur is None:
            dur = DEFAULT_DURATION
            warnings.append(
                ScheduleWarning(
                    code="missing_duration",
                    stop_id=stop.id,
                    message=(
                        f"Duration for '{stop.title}' not set; "
                        f"assuming {DEFAULT_DURATION} min"
                    ),
                )
            )

        departure_utc = cursor_utc + datetime.timedelta(minutes=dur)

        # --- Local display times ---
        arrival_local_dt = arrival_utc.astimezone(current_tz)
        departure_local_dt = departure_utc.astimezone(current_tz)

        # --- Daylight check ---
        if (
            stop.requires_daylight
            and stop.latitude is not None
            and stop.longitude is not None
        ):
            try:
                sunset_dt = get_sunset(
                    stop.latitude,
                    stop.longitude,
                    day_date,
                    current_tz_name,
                )
                if departure_local_dt > sunset_dt:
                    warnings.append(
                        ScheduleWarning(
                            code="after_sunset",
                            stop_id=stop.id,
                            message=f"'{stop.title}' ends after sunset ({sunset_dt.strftime('%H:%M')})",
                        )
                    )
            except Exception:
                pass  # can't compute sunset — skip warning

        item = ScheduleItemResult(
            id=stop.id,
            title=stop.title,
            arrival_utc=arrival_utc,
            departure_utc=departure_utc,
            arrival_local=arrival_local_dt.strftime("%H:%M"),
            departure_local=departure_local_dt.strftime("%H:%M"),
            timezone=current_tz_name,
            duration_minutes=dur,
            drive_minutes_from_previous=drive_min,
            slack_before_minutes=slack,
            overrun_minutes=overrun,
        )
        result.items.append(item)

        cursor_utc = departure_utc

    result.day_end = cursor_utc

    # --- Sunset for the final stop (if coords provided) ---
    if sunset_coords:
        last_tz_name = current_tz_name
        try:
            result.sunset = get_sunset(
                sunset_coords[0],
                sunset_coords[1],
                day_date,
                last_tz_name,
            )
        except Exception:
            pass

    # --- Day-end target check ---
    if day_end_target:
        end_h, end_m = (int(x) for x in day_end_target.split(":"))
        target_local = datetime.datetime(
            day_date.year,
            day_date.month,
            day_date.day,
            end_h,
            end_m,
            tzinfo=current_tz,
        )
        target_utc = target_local.astimezone(datetime.timezone.utc)
        if cursor_utc > target_utc:
            warnings.append(
                ScheduleWarning(
                    code="past_day_end",
                    message=(
                        f"Day ends at {cursor_utc.astimezone(current_tz).strftime('%H:%M')} "
                        f"— misses {day_end_target} target"
                    ),
                )
            )

    # --- Crosses midnight check ---
    day_start_local = result.day_start.astimezone(current_tz).date()
    day_end_local = cursor_utc.astimezone(current_tz).date()
    if day_end_local > day_start_local:
        warnings.append(
            ScheduleWarning(
                code="crosses_midnight",
                message="Schedule crosses midnight into the next day",
            )
        )

    result.warnings = warnings
    return result


# ---------------------------------------------------------------------------
# Adapter: ORM stops → ScheduleInput
# ---------------------------------------------------------------------------


def stops_to_schedule_items(stops) -> list[ScheduleInput]:
    """Convert a list of ``TransportStop`` ORM objects to ``ScheduleInput``s.

    Designed to be the only point that touches the ORM; the scheduler
    itself stays pure.
    """
    return [
        ScheduleInput(
            id=s.id,
            title=s.name,
            duration_minutes=s.duration_minutes,
            drive_minutes_from_previous=s.drive_minutes_from_previous,
            locked_arrival_time=s.locked_arrival_time,
            timezone=s.timezone,
            latitude=s.latitude,
            longitude=s.longitude,
            requires_daylight=s.requires_daylight,
        )
        for s in stops
    ]
