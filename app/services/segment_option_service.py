"""
app/services/segment_option_service.py - Segment Option services
"""

from typing import List, Optional
from sqlalchemy.orm import Session

import models
from app import schemas


def create_segment_option(
    option_data: schemas.SegmentOptionCreate,
    db: Session,
) -> schemas.SegmentOption:
    """Create a new segment option"""
    # Verify segment exists
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == option_data.segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    db_option = models.SegmentOption(**option_data.model_dump())
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return schemas.SegmentOption.model_validate(db_option)


def get_segment_options(segment_id: int, db: Session) -> List[schemas.SegmentOption]:
    """Get all options for a segment"""
    options = (
        db.query(models.SegmentOption)
        .filter(models.SegmentOption.segment_id == segment_id)
        .order_by(models.SegmentOption.order)
        .all()
    )
    return [schemas.SegmentOption.model_validate(opt) for opt in options]


def get_segment_option(option_id: int, db: Session) -> Optional[schemas.SegmentOption]:
    """Get a specific segment option"""
    option = (
        db.query(models.SegmentOption)
        .filter(models.SegmentOption.id == option_id)
        .first()
    )
    if not option:
        return None
    return schemas.SegmentOption.model_validate(option)


def update_segment_option(
    option_id: int,
    option_update: schemas.SegmentOptionUpdate,
    db: Session,
) -> schemas.SegmentOption:
    """Update a segment option"""
    option = (
        db.query(models.SegmentOption)
        .filter(models.SegmentOption.id == option_id)
        .first()
    )
    if not option:
        raise ValueError("Segment option not found")

    update_data = option_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(option, key, value)

    db.commit()
    db.refresh(option)
    return schemas.SegmentOption.model_validate(option)


def delete_segment_option(option_id: int, db: Session) -> bool:
    """Delete a segment option"""
    option = (
        db.query(models.SegmentOption)
        .filter(models.SegmentOption.id == option_id)
        .first()
    )
    if not option:
        raise ValueError("Segment option not found")

    db.delete(option)
    db.commit()
    return True
