"""
app/routers/transport_stops.py - CRUD + cascade schedule for drive-leg stops

Thin layer: auth, ORM adaptation, and delegation to
``app.services.schedule_service`` (which is pure and separately tested).

Author: Travel Planner Team
"""

from __future__ import annotations

import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user
from app.schemas.transport_stop import (
    TransportStopCreate,
    TransportStopUpdate,
    TransportStopRead,
    StopReorderRequest,
    ScheduleItemOut,
    ScheduleResponse,
    ScheduleWarningOut,
)
from app.services.schedule_service import (
    compute_schedule,
    stops_to_schedule_items,
)
from database import get_db

router = APIRouter()


# ---------------------------------------------------------------------------
# Auth helpers (mirror trip_transports.py pattern)
# ---------------------------------------------------------------------------


def _check_trip_access(
    trip_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Trip:
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.user_id == current_user.id:
        return trip
    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return trip
    raise HTTPException(status_code=404, detail="Trip not found")


def _check_transport_access(
    transport_id: int,
    db: Session,
    current_user: models.User,
    require_owner: bool = False,
) -> models.TripTransport:
    transport = (
        db.query(models.TripTransport)
        .filter(models.TripTransport.id == transport_id)
        .first()
    )
    if not transport:
        raise HTTPException(status_code=404, detail="Transport not found")
    _check_trip_access(transport.trip_id, db, current_user, require_owner)
    return transport


# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/transport/{transport_id}/stops",
    response_model=TransportStopRead,
    status_code=201,
)
def create_stop(
    transport_id: int,
    data: TransportStopCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    transport = _check_transport_access(
        transport_id, db, current_user, require_owner=True
    )
    stop = models.TransportStop(transport_id=transport.id, **data.model_dump())
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return stop


@router.get(
    "/transport/{transport_id}/stops",
    response_model=List[TransportStopRead],
)
def list_stops(
    transport_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user)
    return (
        db.query(models.TransportStop)
        .filter(models.TransportStop.transport_id == transport_id)
        .order_by(models.TransportStop.sort_order)
        .all()
    )


@router.get(
    "/transport/{transport_id}/stops/{stop_id}",
    response_model=TransportStopRead,
)
def get_stop(
    transport_id: int,
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user)
    stop = (
        db.query(models.TransportStop)
        .filter(
            models.TransportStop.id == stop_id,
            models.TransportStop.transport_id == transport_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    return stop


@router.put(
    "/transport/{transport_id}/stops/reorder",
    response_model=List[TransportStopRead],
)
def reorder_stops(
    transport_id: int,
    data: StopReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user, require_owner=True)
    stop_ids = {item.id: item.sort_order for item in data.stops}
    stops = (
        db.query(models.TransportStop)
        .filter(
            models.TransportStop.transport_id == transport_id,
            models.TransportStop.id.in_(stop_ids.keys()),
        )
        .all()
    )
    for stop in stops:
        stop.sort_order = stop_ids[stop.id]
    db.commit()
    return (
        db.query(models.TransportStop)
        .filter(models.TransportStop.transport_id == transport_id)
        .order_by(models.TransportStop.sort_order)
        .all()
    )


@router.put(
    "/transport/{transport_id}/stops/{stop_id}",
    response_model=TransportStopRead,
)
def update_stop(
    transport_id: int,
    stop_id: int,
    data: TransportStopUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user, require_owner=True)
    stop = (
        db.query(models.TransportStop)
        .filter(
            models.TransportStop.id == stop_id,
            models.TransportStop.transport_id == transport_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(stop, field, value)
    db.commit()
    db.refresh(stop)
    return stop


@router.delete(
    "/transport/{transport_id}/stops/{stop_id}",
    status_code=204,
)
def delete_stop(
    transport_id: int,
    stop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _check_transport_access(transport_id, db, current_user, require_owner=True)
    stop = (
        db.query(models.TransportStop)
        .filter(
            models.TransportStop.id == stop_id,
            models.TransportStop.transport_id == transport_id,
        )
        .first()
    )
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
    db.delete(stop)
    db.commit()


# ---------------------------------------------------------------------------
# Schedule (computed, never persisted)
# ---------------------------------------------------------------------------


@router.get(
    "/transport/{transport_id}/schedule",
    response_model=ScheduleResponse,
)
def get_schedule(
    transport_id: int,
    departure_time: str = Query(..., description="HH:MM departure time"),
    day_date: str = Query(..., description="YYYY-MM-DD date"),
    day_end_target: str | None = Query(None, description="HH:MM target arrival"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    transport = _check_transport_access(transport_id, db, current_user)

    orm_stops = (
        db.query(models.TransportStop)
        .filter(models.TransportStop.transport_id == transport_id)
        .order_by(models.TransportStop.sort_order)
        .all()
    )

    schedule_items = stops_to_schedule_items(orm_stops)

    # Resolve default timezone: first stop's tz → transport origin tz → UTC
    default_tz = "UTC"
    if schedule_items and schedule_items[0].timezone:
        default_tz = schedule_items[0].timezone
    elif transport.origin_timezone:
        default_tz = transport.origin_timezone

    # Sunset coords: use last stop with coords, or destination coords
    sunset_coords = None
    for s in reversed(orm_stops):
        if s.latitude is not None and s.longitude is not None:
            sunset_coords = (s.latitude, s.longitude)
            break
    if (
        sunset_coords is None
        and transport.destination_latitude
        and transport.destination_longitude
    ):
        sunset_coords = (
            transport.destination_latitude,
            transport.destination_longitude,
        )

    parsed_date = datetime.date.fromisoformat(day_date)

    result = compute_schedule(
        stops=schedule_items,
        departure_time=departure_time,
        day_date=parsed_date,
        default_timezone=default_tz,
        day_end_target=day_end_target,
        sunset_coords=sunset_coords,
    )

    return ScheduleResponse(
        items=[
            ScheduleItemOut(
                id=item.id,
                title=item.title,
                arrival_local=item.arrival_local,
                departure_local=item.departure_local,
                timezone=item.timezone,
                duration_minutes=item.duration_minutes,
                drive_minutes_from_previous=item.drive_minutes_from_previous,
                slack_before_minutes=item.slack_before_minutes,
                overrun_minutes=item.overrun_minutes,
            )
            for item in result.items
        ],
        warnings=[
            ScheduleWarningOut(
                code=w.code,
                stop_id=w.stop_id,
                message=w.message,
            )
            for w in result.warnings
        ],
        day_start=result.day_start.isoformat() if result.day_start else None,
        day_end=result.day_end.isoformat() if result.day_end else None,
        sunset=result.sunset.isoformat() if result.sunset else None,
    )
