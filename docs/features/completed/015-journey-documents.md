# Feature: Journey Documents

**Status:** Planned
**Priority:** Medium
**Complexity:** Low

## Overview

Allow users to attach documents, tickets, and confirmations to journeys. This keeps all travel documentation organized and accessible in one place.

## Use Cases

- Attach flight boarding passes (PDF or image)
- Save train e-tickets
- Store car rental confirmation
- Keep hotel booking at destination
- Save route maps or directions
- Store visa/entry requirements

## Requirements

1. Upload files or save URLs/links
2. Support common file types (PDF, images, text)
3. Display documents in journey detail view
4. Quick access from timeline
5. Include document references in print view

## Data Model

### JourneyDocument
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Primary key |
| journey_id | Integer (FK) | Yes | Parent journey |
| name | String(200) | Yes | Document name |
| document_type | Enum | Yes | Type of document |
| file_path | String(500) | No | Path to uploaded file |
| url | String(500) | No | External URL/link |
| notes | Text | No | Additional details |
| created_at | DateTime | Yes | Upload timestamp |

### Document Types
- `ticket` - Boarding pass, e-ticket
- `confirmation` - Booking confirmation
- `rental` - Car/equipment rental
- `map` - Route map, directions
- `visa` - Visa, entry document
- `insurance` - Travel insurance
- `other` - Other documents

## API Endpoints

```
POST   /journeys/{journey_id}/documents/     - Upload/add document
GET    /journeys/{journey_id}/documents/     - List documents
GET    /journeys/{journey_id}/documents/{id} - Get document
DELETE /journeys/{journey_id}/documents/{id} - Remove document
```

## Frontend Changes

### Journey Detail View
- Documents section with list/grid view
- Upload button for files
- Add link button for URLs
- Preview for images/PDFs
- Download/open buttons

### Timeline View
- Document icon/badge on journeys with attachments
- Quick access to view documents

### Print View
- List document names and confirmation numbers
- Don't print actual files (just references)

## Files to Create/Modify

### Backend
- `app/models/journey_document.py` (new)
- `app/schemas/journey_document.py` (new)
- `app/routers/journey_documents.py` (new)
- File upload handling (use existing patterns or add)

### Frontend
- `frontend/lib/types.ts` (add JourneyDocument interface)
- `frontend/lib/api.ts` (add document endpoints)
- `frontend/components/journeys/JourneyDocuments.tsx` (new)
- `frontend/components/journeys/DocumentUpload.tsx` (new)

## Storage Considerations

### Option A: Local File Storage (Simple)
- Store in `/uploads/journey_documents/`
- Good for self-hosted deployments

### Option B: Cloud Storage (Scalable)
- S3, Google Cloud Storage, or similar
- Better for production deployments
- Requires additional configuration

### Recommendation
Start with local storage, add cloud option later.

## UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Documents                                           │
├─────────────────────────────────────────────────────┤
│ 📄 Boarding Pass - UA1234.pdf          [View] [⋮]  │
│    Ticket • Uploaded Jan 15                        │
│                                                     │
│ 🔗 Car Rental Confirmation              [Open] [⋮] │
│    Rental • hertz.com/confirmation/...             │
│                                                     │
│ [+ Upload File]  [+ Add Link]                      │
└─────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] JourneyDocument model created
- [ ] File upload endpoint working
- [ ] URL/link saving working
- [ ] Documents listed in journey view
- [ ] File preview/download functional
- [ ] Document references in print view
- [ ] Delete document working
- [ ] Document count badge on timeline

## Security Considerations

- Validate file types on upload
- Limit file size (e.g., 10MB)
- Sanitize filenames
- Ensure users can only access their own documents
