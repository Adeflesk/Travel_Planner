"""
app/routers/segment_options.py - Segment Option routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_db, get_current_user
from app import schemas, models
from app.services import segment_option_service as svc

router = APIRouter(prefix="/segment-options", tags=["segment-options"])


@router.post("/", response_model=schemas.SegmentOption, status_code=201)
def create_segment_option(
    option: schemas.SegmentOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new transport option for a journey segment"""
    try:
        return svc.create_segment_option(option, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/segment/{segment_id}", response_model=List[schemas.SegmentOption])
def get_segment_options(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all transport options for a segment"""
    return svc.get_segment_options(segment_id, db)


@router.get("/{option_id}", response_model=schemas.SegmentOption)
def get_segment_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific segment option"""
    option = svc.get_segment_option(option_id, db)
    if not option:
        raise HTTPException(status_code=404, detail="Segment option not found")
    return option


@router.put("/{option_id}", response_model=schemas.SegmentOption)
def update_segment_option(
    option_id: int,
    option_update: schemas.SegmentOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a segment option"""
    try:
        return svc.update_segment_option(option_id, option_update, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{option_id}", status_code=204)
def delete_segment_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a segment option"""
    try:
        svc.delete_segment_option(option_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
