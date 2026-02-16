"""
app/services/journey_segment_service.py - Journey segment services
"""

from __future__ import annotations

import json
from typing import List

from sqlalchemy.orm import Session

import models


def _validate_destination(destination_id: int, db: Session, label: str) -> None:
    if (
        not db.query(models.Destination)
        .filter(models.Destination.id == destination_id)
        .first()
    ):
        raise ValueError(f"{label} destination not found")


def _normalize_metadata(metadata: dict | None) -> str | None:
    if metadata is None:
        return None
    return json.dumps(metadata)


def create_journey_segment(segment_data, db: Session):
    journey = (
        db.query(models.Journey)
        .filter(models.Journey.id == segment_data.journey_id)
        .first()
    )
    if not journey:
        raise ValueError("Journey not found")

    if getattr(segment_data, "origin_id", None):
        _validate_destination(segment_data.origin_id, db, "Origin")

    if getattr(segment_data, "destination_id", None):
        _validate_destination(segment_data.destination_id, db, "Destination")

    data = segment_data.model_dump()
    metadata_json = _normalize_metadata(data.pop("metadata", None))

    db_segment = models.JourneySegment(**data, metadata_json=metadata_json)
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return db_segment


def get_journey_segments(journey_id: int, db: Session) -> List[models.JourneySegment]:
    return (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order, models.JourneySegment.start_datetime)
        .all()
    )


def get_journey_segment(segment_id: int, db: Session):
    return (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )


def update_journey_segment(segment_id: int, segment_update, db: Session):
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    update_data = segment_update.model_dump(exclude_unset=True)

    if "origin_id" in update_data and update_data["origin_id"]:
        _validate_destination(update_data["origin_id"], db, "Origin")

    if "destination_id" in update_data and update_data["destination_id"]:
        _validate_destination(update_data["destination_id"], db, "Destination")

    if "metadata" in update_data:
        segment.metadata_json = _normalize_metadata(update_data.pop("metadata"))

    for key, value in update_data.items():
        setattr(segment, key, value)

    db.commit()
    db.refresh(segment)
    return segment


def delete_journey_segment(segment_id: int, db: Session):
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    db.delete(segment)
    db.commit()
    return True
