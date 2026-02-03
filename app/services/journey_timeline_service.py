"""
app/services/journey_timeline_service.py - Journey timeline aggregation

Builds a timeline of stops and selected stop activities for a journey.

Author: Travel Planner Team
"""

from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from app import models, schemas


def _get_sort_key_for_stop(stop: models.JourneyStop) -> tuple:
    time_value = (
        stop.actual_arrival
        or stop.planned_arrival
        or stop.actual_departure
        or stop.planned_departure
    )
    return (time_value or datetime.min, stop.order, stop.id)


def _get_sort_key_for_option(option: models.StopOption) -> tuple:
    return (option.order, option.id)


def get_journey_timeline(
    journey_id: int, db: Session
) -> schemas.JourneyTimelineResponse | None:
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        return None

    stops = (
        db.query(models.JourneyStop)
        .filter(models.JourneyStop.journey_id == journey_id)
        .all()
    )

    items: List[schemas.JourneyTimelineItem] = []

    for stop in sorted(stops, key=_get_sort_key_for_stop):
        items.append(
            schemas.JourneyTimelineStop(
                id=stop.id,
                journey_id=stop.journey_id,
                name=stop.name,
                location=stop.location,
                planned_arrival=stop.planned_arrival,
                planned_departure=stop.planned_departure,
                actual_arrival=stop.actual_arrival,
                actual_departure=stop.actual_departure,
                notes=stop.notes,
                order=stop.order,
            )
        )

        options = (
            db.query(models.StopOption)
            .filter(models.StopOption.stop_id == stop.id)
            .all()
        )
        for option in sorted(options, key=_get_sort_key_for_option):
            items.append(
                schemas.JourneyTimelineActivity(
                    id=option.id,
                    stop_id=option.stop_id,
                    name=option.name,
                    description=option.description,
                    option_type=option.option_type,
                    estimated_duration=option.estimated_duration,
                    estimated_cost=float(option.estimated_cost)
                    if option.estimated_cost is not None
                    else None,
                    currency=option.currency,
                    url=option.url,
                    notes=option.notes,
                    status=option.status,
                    order=option.order,
                )
            )

    return schemas.JourneyTimelineResponse(journey_id=journey_id, items=items)
