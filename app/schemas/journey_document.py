"""
app/schemas/journey_document.py - JourneyDocument Pydantic schemas

Defines JourneyDocument-related Pydantic models.

Author: Travel Planner Team
"""

from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, Literal


# Valid document types
DocumentType = Literal[
    "ticket", "confirmation", "rental", "map", "visa", "insurance", "other"
]


class JourneyDocumentBase(BaseModel):
    name: str
    document_type: DocumentType = "other"
    file_path: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_file_or_url(self):
        if not self.file_path and not self.url:
            raise ValueError("Either file_path or url must be provided")
        return self


class JourneyDocumentCreate(BaseModel):
    """Schema for creating a document (without file_path, which is set by server)."""

    journey_id: int
    name: str
    document_type: DocumentType = "other"
    url: Optional[str] = None
    notes: Optional[str] = None


class JourneyDocumentUpdate(BaseModel):
    name: Optional[str] = None
    document_type: Optional[DocumentType] = None
    url: Optional[str] = None
    notes: Optional[str] = None


class JourneyDocument(BaseModel):
    id: int
    journey_id: int
    name: str
    document_type: DocumentType
    file_path: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
