"""
app/routers/journey_documents.py - Journey documents endpoints router

CRUD endpoints for journey documents with file upload support.
All endpoints require authentication.

Author: Travel Planner Team
"""

import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app import schemas, models
from app.core.deps import get_current_user
from database import get_db

router = APIRouter()

# Upload directory configuration
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "documents")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".doc", ".docx"}


def ensure_upload_dir():
    """Ensure upload directory exists."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@router.post(
    "/journeys/{journey_id}/documents/",
    response_model=schemas.JourneyDocument,
    status_code=201,
    tags=["journey-documents"],
)
async def create_document_with_link(
    journey_id: int,
    document: schemas.JourneyDocumentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a document link to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    if document.journey_id != journey_id:
        raise HTTPException(
            status_code=400, detail="Journey ID in body must match path parameter"
        )

    if not document.url:
        raise HTTPException(
            status_code=400, detail="URL is required for link documents"
        )

    db_document = models.JourneyDocument(
        journey_id=journey_id,
        name=document.name,
        document_type=document.document_type,
        url=document.url,
        notes=document.notes,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


@router.post(
    "/journeys/{journey_id}/documents/upload",
    response_model=schemas.JourneyDocument,
    status_code=201,
    tags=["journey-documents"],
)
async def upload_document(
    journey_id: int,
    file: UploadFile = File(...),
    name: str = Form(...),
    document_type: str = Form("other"),
    notes: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload a file document to a journey."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    # Generate unique filename
    ensure_upload_dir()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create database record
    db_document = models.JourneyDocument(
        journey_id=journey_id,
        name=name,
        document_type=document_type,
        file_path=unique_filename,  # Store just the filename
        notes=notes,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document


@router.get(
    "/journeys/{journey_id}/documents/",
    response_model=List[schemas.JourneyDocument],
    tags=["journey-documents"],
)
def get_journey_documents(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all documents for a journey."""
    check_journey_access(journey_id, db, current_user)

    documents = (
        db.query(models.JourneyDocument)
        .filter(models.JourneyDocument.journey_id == journey_id)
        .order_by(models.JourneyDocument.created_at.desc())
        .all()
    )
    return documents


@router.get(
    "/journeys/{journey_id}/documents/{document_id}",
    response_model=schemas.JourneyDocument,
    tags=["journey-documents"],
)
def get_journey_document(
    journey_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific document."""
    check_journey_access(journey_id, db, current_user)

    document = (
        db.query(models.JourneyDocument)
        .filter(
            models.JourneyDocument.id == document_id,
            models.JourneyDocument.journey_id == journey_id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.put(
    "/journeys/{journey_id}/documents/{document_id}",
    response_model=schemas.JourneyDocument,
    tags=["journey-documents"],
)
def update_journey_document(
    journey_id: int,
    document_id: int,
    document_update: schemas.JourneyDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a journey document."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    document = (
        db.query(models.JourneyDocument)
        .filter(
            models.JourneyDocument.id == document_id,
            models.JourneyDocument.journey_id == journey_id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for key, value in document_update.model_dump(exclude_unset=True).items():
        setattr(document, key, value)

    db.commit()
    db.refresh(document)
    return document


@router.delete(
    "/journeys/{journey_id}/documents/{document_id}",
    status_code=204,
    tags=["journey-documents"],
)
def delete_journey_document(
    journey_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a journey document."""
    check_journey_access(journey_id, db, current_user, require_owner=True)

    document = (
        db.query(models.JourneyDocument)
        .filter(
            models.JourneyDocument.id == document_id,
            models.JourneyDocument.journey_id == journey_id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file if it exists
    if document.file_path:
        file_path = os.path.join(UPLOAD_DIR, document.file_path)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass  # Continue even if file deletion fails

    db.delete(document)
    db.commit()
    return None
