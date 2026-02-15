"""
app/routers/journey_segments.py - Journey segments endpoints router

CRUD endpoints for journey segments.
All endpoints require authentication.

Author: Travel Planner Team
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from database import get_db

router = APIRouter()


def check_journey_access(
    journey_id: int, db: Session, current_user: models.User, require_owner: bool = False
) -> models.Journey:
    """Check user has access to the journey's trip."""
    journey = db.query(models.Journey).filter(models.Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    trip = db.query(models.Trip).filter(models.Trip.id == journey.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.user_id == current_user.id:
        return journey

    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip.id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share:
            return journey

    raise HTTPException(status_code=404, detail="Journey not found")


class ReorderRequest(BaseModel):
    """Request body for reordering segments."""

    segment_ids: List[int]


def normalize_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[str]:
    if not metadata:
        return None
    return json.dumps(metadata)


def parse_metadata(metadata_json: Optional[str]) -> Optional[Dict[str, Any]]:
    if not metadata_json:
        return None
    try:
        return json.loads(metadata_json)
    except json.JSONDecodeError:
        return None


def segment_to_schema(segment: models.JourneySegment) -> schemas.JourneySegment:
    return schemas.JourneySegment.model_validate(
        {
            "id": segment.id,
            "journey_id": segment.journey_id,
            "segment_type": segment.segment_type,
            "origin_id": segment.origin_id,
            "origin_name": segment.origin_name,
            "destination_id": segment.destination_id,
            "destination_name": segment.destination_name,
            "start_datetime": segment.start_datetime,
            "end_datetime": segment.end_datetime,
            "origin_timezone": segment.origin_timezone,
            "destination_timezone": segment.destination_timezone,
            "metadata": parse_metadata(segment.metadata_json),
            "order": segment.order,
        }
    )


@router.post(
    "/journeys/{journey_id}/segments/",
    response_model=schemas.JourneySegment,
    status_code=201,
    tags=["journey-segments"],
)
def create_journey_segment(
    journey_id: int,
    segment: schemas.JourneySegmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a segment to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    if segment.journey_id != journey_id:
        raise HTTPException(
            status_code=400, detail="Journey ID in body must match path parameter"
        )

    segment_data = segment.model_dump()
    metadata = segment_data.pop("metadata", None)
    segment_data["metadata_json"] = normalize_metadata(metadata)

    db_segment = models.JourneySegment(**segment_data)
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return segment_to_schema(db_segment)


@router.get(
    "/journeys/{journey_id}/segments/",
    response_model=List[schemas.JourneySegment],
    tags=["journey-segments"],
)
def get_journey_segments(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all segments for a journey."""
    check_journey_access(journey_id, db, current_user)

    segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order, models.JourneySegment.start_datetime)
        .all()
    )
    return [segment_to_schema(segment) for segment in segments]


@router.get(
    "/journeys/{journey_id}/segments/{segment_id}",
    response_model=schemas.JourneySegment,
    tags=["journey-segments"],
)
def get_journey_segment(
    journey_id: int,
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific journey segment."""
    check_journey_access(journey_id, db, current_user)

    segment = (
        db.query(models.JourneySegment)
        .filter(
            models.JourneySegment.id == segment_id,
            models.JourneySegment.journey_id == journey_id,
        )
        .first()
    )
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    return segment_to_schema(segment)


@router.put(
    "/journeys/{journey_id}/segments/{segment_id}",
    response_model=schemas.JourneySegment,
    tags=["journey-segments"],
)
def update_journey_segment(
    journey_id: int,
    segment_id: int,
    segment_update: schemas.JourneySegmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a journey segment."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    segment = (
        db.query(models.JourneySegment)
        .filter(
            models.JourneySegment.id == segment_id,
            models.JourneySegment.journey_id == journey_id,
        )
        .first()
    )
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    update_data = segment_update.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        segment.metadata_json = normalize_metadata(update_data.pop("metadata"))

    for key, value in update_data.items():
        setattr(segment, key, value)

    db.commit()
    db.refresh(segment)
    return segment_to_schema(segment)


@router.delete(
    "/journeys/{journey_id}/segments/{segment_id}",
    status_code=204,
    tags=["journey-segments"],
)
def delete_journey_segment(
    journey_id: int,
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove a segment from a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    segment = (
        db.query(models.JourneySegment)
        .filter(
            models.JourneySegment.id == segment_id,
            models.JourneySegment.journey_id == journey_id,
        )
        .first()
    )
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    db.delete(segment)
    db.commit()
    return None


@router.patch(
    "/journeys/{journey_id}/segments/reorder",
    response_model=List[schemas.JourneySegment],
    tags=["journey-segments"],
)
def reorder_journey_segments(
    journey_id: int,
    reorder: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Reorder segments within a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .all()
    )
    segment_map = {segment.id: segment for segment in segments}

    for index, segment_id in enumerate(reorder.segment_ids):
        if segment_id not in segment_map:
            raise HTTPException(
                status_code=400,
                detail=f"Segment {segment_id} not found in this journey",
            )
        segment_map[segment_id].order = index

    db.commit()

    updated_segments = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.journey_id == journey_id)
        .order_by(models.JourneySegment.order)
        .all()
    )
    return [segment_to_schema(segment) for segment in updated_segments]
