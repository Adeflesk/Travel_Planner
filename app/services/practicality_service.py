"""
app/services/practicality_service.py - Practicality engine

Calculates time and budget feasibility for a journey by summing
segment durations/costs and comparing against configurable limits.
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Optional
import zoneinfo

from sqlalchemy.orm import Session

from app import models
from app.schemas.practicality import PracticalityResponse, SegmentPracticality

# Defaults
DEFAULT_TIME_LIMIT_MINUTES = 14 * 60  # 14 hours
DEFAULT_BUFFER_MINUTES = 15


def get_journey_practicality(
    journey_id: int,
    db: Session,
    time_limit_minutes: int = DEFAULT_TIME_LIMIT_MINUTES,
    buffer_minutes: int = DEFAULT_BUFFER_MINUTES,
) -> Optional[PracticalityResponse]:
    """
    Calculate time and budget feasibility for a journey.

    For each segment:
    - Transport segments: use selected SegmentOption duration/cost,
      or fall back to segment start/end datetime delta.
    - Stop segments: sum selected/planned StopOption durations and costs.

    Adds a configurable buffer between each segment transition.
    """
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        return None

    # Get trip budget for daily budget calculation
    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    daily_budget = _calculate_daily_budget(trip) if trip else None

    # Get segments ordered
    segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order)
        .all()
    )

    segment_results = []
    total_duration = 0
    total_cost = Decimal("0")
    transition_count = max(0, len(segments) - 1)

    for seg in segments:
        seg_duration = 0
        seg_cost = Decimal("0")
        items = []

        if seg.segment_type.upper() == "STOP":
            # Sum stop options that are selected or planned
            stop_options = (
                db.query(models.StopOption)
                .filter(
                    models.StopOption.segment_id == seg.id,
                    models.StopOption.status.in_(["considering", "selected", "done"]),
                )
                .all()
            )
            for opt in stop_options:
                if opt.estimated_duration:
                    seg_duration += opt.estimated_duration
                if opt.estimated_cost:
                    seg_cost += Decimal(str(opt.estimated_cost))
                items.append(opt.name)
        else:
            # Transport segment: use selected segment option
            selected_option = (
                db.query(models.SegmentOption)
                .filter(
                    models.SegmentOption.segment_id == seg.id,
                    models.SegmentOption.status == "selected",
                )
                .first()
            )

            # Always read direct cost from metadata (user-entered on the segment card)
            meta_cost = _metadata_cost(seg)

            if selected_option:
                if selected_option.estimated_duration:
                    seg_duration = selected_option.estimated_duration
                # Prefer selected option cost; fall back to metadata cost
                seg_cost = (
                    Decimal(str(selected_option.cost))
                    if selected_option.cost
                    else meta_cost
                )
                items.append(selected_option.name)
            else:
                seg_cost = meta_cost

            if not selected_option and seg.start_datetime and seg.end_datetime:
                # Fall back to segment times, ensuring timezone-aware math if timezones are provided
                start = seg.start_datetime
                end = seg.end_datetime

                try:
                    if seg.origin_timezone:
                        start = start.replace(
                            tzinfo=zoneinfo.ZoneInfo(seg.origin_timezone)
                        )
                    if seg.destination_timezone:
                        end = end.replace(
                            tzinfo=zoneinfo.ZoneInfo(seg.destination_timezone)
                        )
                except Exception:
                    pass  # Fall back to naive subtraction if zone parsing fails

                delta = end - start
                seg_duration = int(delta.total_seconds() / 60)
                items.append(f"{seg.segment_type} segment")

        # Build segment name from origin/destination
        name = _segment_display_name(seg)

        total_duration += seg_duration
        total_cost += seg_cost

        segment_results.append(
            SegmentPracticality(
                segment_id=seg.id,
                segment_type=seg.segment_type,
                name=name,
                duration_minutes=seg_duration,
                cost=seg_cost,
                items=items,
            )
        )

    # Add transition buffers
    total_duration += transition_count * buffer_minutes

    return PracticalityResponse(
        journey_id=journey_id,
        total_duration_minutes=total_duration,
        total_cost=total_cost,
        time_limit_minutes=time_limit_minutes,
        daily_budget=daily_budget,
        time_feasible=total_duration <= time_limit_minutes,
        budget_feasible=(
            total_cost <= daily_budget if daily_budget is not None else True
        ),
        buffer_minutes_per_transition=buffer_minutes,
        transition_count=transition_count,
        segments=segment_results,
    )


def _calculate_daily_budget(trip: models.Trip) -> Optional[Decimal]:
    """Calculate daily budget from trip budget and duration."""
    if not trip.budget:
        return None

    budget = Decimal(str(trip.budget))

    if trip.start_date and trip.end_date:
        days = (trip.end_date - trip.start_date).days
        if days > 0:
            return budget / days

    return budget


def _metadata_cost(seg: models.JourneySegment) -> Decimal:
    """Read cost from segment metadata_json (direct user input on the segment card)."""
    try:
        meta = seg.metadata_json
        if meta:
            if isinstance(meta, str):
                meta = json.loads(meta)
            if isinstance(meta, dict) and meta.get("cost") not in (None, "", "0", 0):
                return Decimal(str(meta["cost"]))
    except Exception:
        pass
    return Decimal("0")


def _segment_display_name(seg: models.JourneySegment) -> str:
    """Build a display name for a segment."""
    origin = seg.origin_name or "Origin"
    dest = seg.destination_name or "Destination"

    if seg.segment_type.upper() == "STOP":
        return dest if dest != "Destination" else origin
    return f"{origin} -> {dest}"
