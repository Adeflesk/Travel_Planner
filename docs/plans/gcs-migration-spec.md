# Technical Specification: GCS Free Tier Migration for Journey Documents

## Overview
This specification details the code changes required to transition Journey Document uploads from local file storage to Google Cloud Storage (GCS). The implementation will use the `google-cloud-storage` Python library and follow best practices for dependency injection, configuration management, and robust error handling.

## Requirements Updates

Add the Google Cloud Storage client library to the project dependencies.

**`requirements.txt`**
```text
google-cloud-storage>=2.14.0
```

## Configuration Updates

Add GCS configuration keys to the application's settings model.

**`app/core/config.py`**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Existing settings...
    
    # GCS Configuration
    GCS_BUCKET_NAME: str | None = None
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None # Path to service account JSON
    USE_GCS_STORAGE: bool = False # Feature flag to toggle between local and GCS

    class Config:
        env_file = ".env"

settings = Settings()
```

## Storage Service Abstraction

Create a new service module to handle storage operations. This encapsulates GCS logic and provides a clear interface.

**`app/services/storage_service.py`** (New File)
```python
import os
import uuid
import shutil
from typing import BinaryIO
from google.cloud import storage
from fastapi import HTTPException
from app.core.config import settings

# Local upload directory fallback
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "documents")

class StorageService:
    def __init__(self):
        self.use_gcs = settings.USE_GCS_STORAGE
        self.bucket_name = settings.GCS_BUCKET_NAME
        self._gcs_client = None
        
        if self.use_gcs:
            if not self.bucket_name:
                raise ValueError("GCS_BUCKET_NAME must be set when USE_GCS_STORAGE is true")
            try:
                self._gcs_client = storage.Client()
                self._bucket = self._gcs_client.bucket(self.bucket_name)
            except Exception as e:
                # Log error and potentially fallback or fail fast
                raise RuntimeError(f"Failed to initialize GCS client: {e}")
        else:
            os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

    def upload_file(self, file_obj: BinaryIO, filename: str) -> str:
        """
        Uploads a file and returns the storage path/identifier.
        """
        file_ext = os.path.splitext(filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        if self.use_gcs:
            try:
                blob = self._bucket.blob(unique_filename)
                # Rewind file pointer just in case
                file_obj.seek(0)
                blob.upload_from_file(file_obj)
                return unique_filename
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to upload file to GCS: {str(e)}")
        else:
            file_path = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)
            try:
                file_obj.seek(0)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file_obj, buffer)
                return unique_filename
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to save file locally: {str(e)}")

    def delete_file(self, identifier: str) -> bool:
        """
        Deletes a file from storage. Returns True if successful or not found.
        """
        if not identifier:
            return True

        if self.use_gcs:
            try:
                blob = self._bucket.blob(identifier)
                if blob.exists():
                    blob.delete()
                return True
            except Exception as e:
                # Log error
                print(f"Error deleting file from GCS: {e}")
                return False
        else:
            file_path = os.path.join(LOCAL_UPLOAD_DIR, identifier)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting local file: {e}")
                    return False
            return True

    def get_public_url(self, identifier: str) -> str | None:
        """
        Generates a public or signed URL for the document.
        """
        if not identifier:
            return None
            
        if self.use_gcs:
            # For Free Tier without public access, generate a signed URL
            # Note: Requires appropriate service account permissions
            try:
                blob = self._bucket.blob(identifier)
                return blob.generate_signed_url(
                    version="v4",
                    expiration=datetime.timedelta(hours=1),
                    method="GET"
                )
            except Exception:
                return None
        else:
            # Return relative path or host path for local
            return f"/api/uploads/documents/{identifier}"

# Singleton instance
storage_service = StorageService()
```

## Router Updates

Refactor the journey documents router to use the new `StorageService` instead of handling local file operations directly.

**`app/routers/journey_documents.py`**
```python
# ... existing imports
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.services.storage_service import storage_service

# Remove UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS constants globally if moved
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".doc", ".docx"}

# ... keep existing check_journey_access ...

@router.post(
    "/journeys/{journey_id}/documents/upload",
    response_model=schemas.JourneyDocument,
    # ...
)
async def upload_document(
    # ... existing parameters
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

    # Delegate upload to Storage Service
    unique_filename = storage_service.upload_file(file.file, file.filename)

    # Create database record
    db_document = models.JourneyDocument(
        journey_id=journey_id,
        name=name,
        document_type=document_type,
        file_path=unique_filename,
        notes=notes,
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

@router.delete(
    "/journeys/{journey_id}/documents/{document_id}",
    # ...
)
def delete_journey_document(
    # ... existing parameters
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

    # Delegate deletion to Storage Service
    if document.file_path:
        storage_service.delete_file(document.file_path)

    db.delete(document)
    db.commit()
    return None
```

## Model/Schema Serialization (Optional but Recommended)

If the frontend needs direct URLs to the GCS objects to preview them (rather than serving them through the FastAPI app), update the schema or a specific retrieval endpoint to generate temporary Signed URLs via the `StorageService`.

## Operations Checklist
1. Add `google-cloud-storage` to standard dependencies.
2. Add `USE_GCS_STORAGE=True` and `GCS_BUCKET_NAME=your-bucket-name` to `.env`.
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` path in the environment pointing to the service account JSON.
4. Implement the Code changes above.
5. Create a script to copy any existing files from local `/uploads/documents/` to GCS if migration of existing data is needed.
