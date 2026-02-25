"""
app/services/journey_segment_service.py - Journey segment services
"""

import json
from typing import List, Optional

from sqlalchemy.orm import Session

import models
from app import schemas
from app.services.expense_service import sync_segment_expense


def _sync_journey_datetime(journey_id: int, db: Session):
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        return

    segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order)
        .all()
    )

    if segments:
        first = segments[0]
        last = segments[-1]

        journey.departure_datetime = first.start_datetime or journey.departure_datetime
        journey.arrival_datetime = last.end_datetime or journey.arrival_datetime

        # Journey models don't have timezone Columns in DB, but if they
        # did, we would attach them here. However, by patching naive times,
        # the overarching DB bounds are now aligned with the flight segments!

        # Calculate total segment cost
        total_segment_cost = 0
        for seg in segments:
            # Check for direct metadata cost first
            try:
                import json

                meta = seg.metadata_json
                if meta:
                    if isinstance(meta, str):
                        meta = json.loads(meta)
                    if isinstance(meta, dict) and "cost" in meta:
                        try:
                            total_segment_cost += float(meta["cost"])
                        except (ValueError, TypeError):
                            pass
            except Exception:
                pass

        journey.cost = total_segment_cost if total_segment_cost > 0 else None

        db.commit()


def _serialize_segment(segment: models.JourneySegment) -> schemas.JourneySegment:
    metadata = None
    if segment.metadata_json:
        try:
            # Postgres returns JSON as dict, SQLite as string
            if isinstance(segment.metadata_json, str):
                metadata = json.loads(segment.metadata_json)
            else:
                metadata = segment.metadata_json
        except json.JSONDecodeError:
            metadata = None

    return schemas.JourneySegment(
        id=segment.id,
        journey_id=segment.journey_id,
        segment_type=segment.segment_type,
        origin_id=segment.origin_id,
        origin_name=segment.origin_name,
        destination_id=segment.destination_id,
        destination_name=segment.destination_name,
        start_datetime=segment.start_datetime,
        end_datetime=segment.end_datetime,
        origin_timezone=segment.origin_timezone,
        destination_timezone=segment.destination_timezone,
        metadata=metadata,
        order=segment.order,
    )


def _serialize_segments(
    segments: List[models.JourneySegment],
) -> List[schemas.JourneySegment]:
    return [_serialize_segment(segment) for segment in segments]


def create_journey_segment(
    segment_data: schemas.JourneySegmentCreate,
    db: Session,
) -> schemas.JourneySegment:
    journey = (
        db.query(models.Journey)
        .filter(models.Journey.id == segment_data.journey_id)
        .first()
    )
    if not journey:
        raise ValueError("Journey not found")

    metadata_json: Optional[str] = None
    if segment_data.metadata is not None:
        metadata_json = json.dumps(segment_data.metadata)

    data = segment_data.model_dump(exclude={"metadata"})
    db_segment = models.JourneySegment(
        **data,
        metadata_json=metadata_json,
    )
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)

    # Sync expense record from cost metadata (creates/updates/deletes as needed)
    sync_segment_expense(db_segment, db)
    _sync_journey_datetime(db_segment.journey_id, db)

    return _serialize_segment(db_segment)


def get_journey_segments(journey_id: int, db: Session) -> List[schemas.JourneySegment]:
    segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order)
        .all()
    )
    return _serialize_segments(segments)


def get_journey_segment(
    segment_id: int, db: Session
) -> Optional[schemas.JourneySegment]:
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        return None
    return _serialize_segment(segment)


def update_journey_segment(
    segment_id: int,
    segment_update: schemas.JourneySegmentUpdate,
    db: Session,
) -> schemas.JourneySegment:
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    update_data = segment_update.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        metadata = update_data.pop("metadata")
        segment.metadata_json = json.dumps(metadata) if metadata is not None else None

    for key, value in update_data.items():
        setattr(segment, key, value)

    db.commit()
    db.refresh(segment)

    # Sync expense record from cost metadata (creates/updates/deletes as needed)
    sync_segment_expense(segment, db)
    _sync_journey_datetime(segment.journey_id, db)

    return _serialize_segment(segment)


def delete_journey_segment(segment_id: int, db: Session) -> bool:
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    journey_id = segment.journey_id
    db.delete(segment)
    db.commit()
    _sync_journey_datetime(journey_id, db)
    return True
