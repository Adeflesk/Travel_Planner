# Journey Segments: Data Flow Architecture

## Overview

This document explains the complete data flow for Journey Segments in the Travel Planner application, from UI components through state management to the backend API and database.

The Journey Segments system represents a **hierarchical, modular approach** to travel planning. Instead of treating each journey as a flat record (origin → destination), journeys are composed of multiple **segments** (transfers, flights, layovers, stops), each with its own location, timing, and metadata. This architecture solves the complexity problem through decomposition and reusability.

---

## Feature Implementation Status

| Feature | Status | Priority | Description |
|---------|--------|----------|-------------|
| **Core Segment CRUD** | ✅ Complete | - | Create, read, update, delete segments |
| **Segment Options** | ✅ Complete | - | Compare transport alternatives (bus/taxi/Uber) |
| **Cascade Deletes** | ✅ Complete | - | Deleting journey removes all segments & options |
| **JSON Metadata** | ✅ Complete | - | Flexible type-specific fields (flight #, parking, etc.) |
| **Timezone Inheritance** | ✅ Complete | - | Auto-propagate timezone from prev segment |
| **Location Flexibility** | ✅ Complete | - | Mix DB destinations and free-text locations |
| **Segment Templates** | ✅ Complete | - | Journey intents (Simple, Air Travel, Layover, etc.) |
| **Activities & Expenses** | ❌ Missing | **High** | Plan activities/meals/expenses for segments (esp. STOP) |
| **Gap Validation** | ❌ Missing | High | Validate location/time continuity between segments |
| **Return Journey** | ⚠️ Partial | Medium | Duplicate & reverse segments (exists for old Journey only) |
| **Polymorphic Metadata** | ❌ Missing | Medium | Type-safe validation per segment type (Flight vs Transfer) |
| **Order Re-indexing** | ❌ Missing | Low | Auto-reindex segments after deletion |
| **Drag-Drop Reorder** | ❌ Missing | Low | UI-driven segment reordering |

**Legend:**  
✅ Complete | ⚠️ Partial | ❌ Not Implemented

See [Strategic Improvements](#strategic-improvements--considerations) section for implementation details.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Hierarchy](#component-hierarchy)
3. [Data Flow: Creating a Journey](#data-flow-creating-a-journey)
4. [Data Flow: Managing Segments](#data-flow-managing-segments)
5. [Data Flow: Segment Options](#data-flow-segment-options)
6. [API Layer](#api-layer)
7. [Backend Services](#backend-services)
8. [Database Schema](#database-schema)
9. [Key Concepts](#key-concepts)
10. [Code Examples](#code-examples)
11. [Strategic Improvements & Considerations](#strategic-improvements--considerations)
12. [Summary](#summary)

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Page Component (JourneyDetailPage)                    │ │
│  │  - Fetches journey data                                │ │
│  │  - Manages high-level state                            │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentBuilder                                        │ │
│  │  - Journey intent selection                            │ │
│  │  - Segment type templates                              │ │
│  │  - Smart defaults (timezone inheritance)               │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentManager                                        │ │
│  │  - Displays segment list                               │ │
│  │  - Edit modal for individual segments                  │ │
│  │  - Loads segment options for transfers/bus/rail        │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentCard (Edit Form)                               │ │
│  │  - Segment type selector                               │ │
│  │  - Location inputs (AutocompleteInput)                 │ │
│  │  - Date/time pickers with timezone                     │ │
│  │  - Metadata fields (flight details, etc.)              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentOptionsManager                                 │ │
│  │  - Compare transport providers (Uber/taxi/shuttle)     │ │
│  │  - Track research status                               │ │
│  │  - Booking URLs and notes                              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  API Client (lib/api.ts)                               │ │
│  │  - journeySegmentApi.create/update/delete              │ │
│  │  - segmentOptionApi.create/update/delete               │ │
│  │  - Axios HTTP client with auth headers                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└─────────────────────────┼─────────────────────────────────┘
                          │ HTTP (JSON)
┌─────────────────────────▼─────────────────────────────────┐
│                        BACKEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FastAPI Routers                                       │ │
│  │  - /journey-segments/ (CRUD endpoints)                 │ │
│  │  - /segment-options/ (CRUD endpoints)                  │ │
│  │  - JWT authentication middleware                       │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Service Layer                                         │ │
│  │  - journey_segment_service.py                          │ │
│  │  - segment_option_service.py                           │ │
│  │  - Business logic & validation                         │ │
│  │  - JSON serialization (Postgres vs SQLite)             │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SQLAlchemy Models                                     │ │
│  │  - JourneySegment (ORM model)                          │ │
│  │  - SegmentOption (ORM model)                           │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Database (SQLite dev / Postgres prod)                 │ │
│  │  - journey_segments table                              │ │
│  │  - segment_options table                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Journey Lifecycle: Intent → Database

This diagram shows how a user's journey intent expands into specific database records:

```
USER SELECTS:
  "Air Travel with Layover"
         │
         ▼
TEMPLATE GENERATED:
  ┌─────────────────────────────────────┐
  │ Segment 1: TRANSFER                 │
  │   Home → Airport                    │
  ├─────────────────────────────────────┤
  │ Segment 2: FLIGHT                   │
  │   Airport → Hub                     │
  ├─────────────────────────────────────┤
  │ Segment 3: LAYOVER                  │
  │   Hub → Hub                         │
  ├─────────────────────────────────────┤
  │ Segment 4: FLIGHT                   │
  │   Hub → Final Destination           │
  ├─────────────────────────────────────┤
  │ Segment 5: TRANSFER                 │
  │   Airport → Hotel                   │
  └─────────────────────────────────────┘
         │
         ▼
USER FILLS DETAILS:
  Segment 1 (TRANSFER):
    • Origin: "Home" (custom location)
    • Destination: "DEN Airport" (custom)
    • Timezone: America/Denver
    • Metadata: { parking_location: "Lot B" }
  
  Segment 2 (FLIGHT):
    • Origin: "DEN Airport" (custom)
    • Destination: Dublin (destination_id: 15)
    • Start: 2026-06-15 10:30 (America/Denver)
    • End: 2026-06-15 22:45 (Europe/Dublin)
    • Metadata: { airline: "Aer Lingus", flight_number: "EI123" }
  
  Segment 5 (TRANSFER):
    • Origin: "Dublin Airport" (custom)
    • Destination: Dublin (destination_id: 15)
    • Timezone: Europe/Dublin (inherited!)
    • [User adds transport options...]
         │
         ▼
SEGMENT OPTIONS RESEARCHED:
  Option 1: Airlink Express
    • Provider: Dublin Bus
    • Cost: €7.50
    • Frequency: "Every 15 min"
    • Status: researching
  
  Option 2: Uber
    • Cost: €28
    • Status: selected ✓
  
  Option 3: Taxi
    • Cost: €35
    • Status: researching
         │
         ▼
DATABASE RECORDS:
  ┌─────────────────────────────────────┐
  │ journeys                            │
  ├─────────────────────────────────────┤
  │ id: 123                             │
  │ trip_id: 42                         │
  │ transport_mode: "air"               │
  └─────────────────────────────────────┘
         │
         ├── journey_segments
         │   ├─ id: 1, order: 0, type: TRANSFER
         │   │  origin_name: "Home"
         │   │  destination_name: "DEN Airport"
         │   │  metadata_json: '{"parking_location":"Lot B"}'
         │   │
         │   ├─ id: 2, order: 1, type: FLIGHT
         │   │  origin_name: "DEN Airport"
         │   │  destination_id: 15 → [Destination: Dublin]
         │   │  metadata_json: '{"airline":"Aer Lingus","flight_number":"EI123"}'
         │   │
         │   ├─ id: 3, order: 2, type: LAYOVER
         │   ├─ id: 4, order: 3, type: FLIGHT
         │   │
         │   └─ id: 5, order: 4, type: TRANSFER
         │      origin_name: "Dublin Airport"
         │      destination_id: 15 → [Destination: Dublin]
         │           │
         │           └── segment_options
         │               ├─ id: 1, name: "Airlink Express", cost: 7.50, status: researching
         │               ├─ id: 2, name: "Uber", cost: 28, status: selected
         │               └─ id: 3, name: "Taxi", cost: 35, status: researching
         │
         └─ [Other segments...]
```

**Key Takeaways:**
1. **Intent drives template**: User picks "Air Travel with Layover" → 5 segments auto-created
2. **Progressive enhancement**: Template provides structure, user fills details
3. **Timezone inheritance**: Flight 2 destination timezone auto-fills next segment
4. **Flexible locations**: Mix DB destinations (Dublin) and free text (Home, DEN Airport)
5. **Research workflow**: Segment options track alternatives before booking

---
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentManager                                        │ │
│  │  - Displays segment list                               │ │
│  │  - Edit modal for individual segments                  │ │
│  │  - Loads segment options for transfers/bus/rail        │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentCard (Edit Form)                               │ │
│  │  - Segment type selector                               │ │
│  │  - Location inputs (AutocompleteInput)                 │ │
│  │  - Date/time pickers with timezone                     │ │
│  │  - Metadata fields (flight details, etc.)              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SegmentOptionsManager                                 │ │
│  │  - Compare transport providers (Uber/taxi/shuttle)     │ │
│  │  - Track research status                               │ │
│  │  - Booking URLs and notes                              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  API Client (lib/api.ts)                               │ │
│  │  - journeySegmentApi.create/update/delete              │ │
│  │  - segmentOptionApi.create/update/delete               │ │
│  │  - Axios HTTP client with auth headers                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└─────────────────────────┼─────────────────────────────────┘
                          │ HTTP (JSON)
┌─────────────────────────▼─────────────────────────────────┐
│                        BACKEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FastAPI Routers                                       │ │
│  │  - /journey-segments/ (CRUD endpoints)                 │ │
│  │  - /segment-options/ (CRUD endpoints)                  │ │
│  │  - JWT authentication middleware                       │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Service Layer                                         │ │
│  │  - journey_segment_service.py                          │ │
│  │  - segment_option_service.py                           │ │
│  │  - Business logic & validation                         │ │
│  │  - JSON serialization (Postgres vs SQLite)             │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  SQLAlchemy Models                                     │ │
│  │  - JourneySegment (ORM model)                          │ │
│  │  - SegmentOption (ORM model)                           │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Database (SQLite dev / Postgres prod)                 │ │
│  │  - journey_segments table                              │ │
│  │  - segment_options table                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### 1. **JourneyDetailPage** (`frontend/app/journeys/[id]/page.tsx`)
- **Purpose**: Top-level page component for viewing/editing a journey
- **Responsibilities**:
  - Fetch journey data from API
  - Provide TripProvider context (trip dates, timezone)
  - Render either SegmentBuilder (creation mode) or SegmentManager (edit mode)
- **State**: Journey data, loading states, edit mode
- **Props**: Journey ID from URL params

### 2. **SegmentBuilder** (`frontend/components/journey-segments/SegmentBuilder.tsx`)
- **Purpose**: Wizard for creating journey segments from templates
- **Responsibilities**:
  - Present journey intent options (SIMPLE, AIR_TRAVEL, AIR_LAYOVER, MULTI_STOP)
  - Generate segment templates based on selected intent
  - Allow adding/removing/reordering segments
  - Apply segment type to pre-configure fields
- **State**: Array of `JourneySegmentDraft` objects
- **Key Features**:
  - Templates pre-populate common journey patterns
  - Drag-and-drop reordering
  - Smart defaults based on trip context

### 3. **SegmentManager** (`frontend/components/journey-segments/SegmentManager.tsx`)
- **Purpose**: Display and edit existing journey segments
- **Responsibilities**:
  - Fetch segments for a journey
  - Display segment cards in order
  - Open edit modal for individual segments
  - Load segment options for TRANSFER/BUS/RAIL types
  - Handle CRUD operations via API
- **State**: 
  - `segments[]` - All segments for the journey
  - `editingSegment` - Currently selected segment
  - `segmentOptions[]` - Transport alternatives for current segment
- **Data Flow**:
  ```
  User clicks "Edit segment" 
    ↓
  Opens modal with SegmentCard
    ↓
  If TRANSFER/BUS/RAIL: loads segment options
    ↓
  User edits and saves
    ↓
  Calls journeySegmentApi.update()
    ↓
  Refreshes segment list
  ```

### 4. **SegmentCard** (`frontend/components/journey-segments/SegmentCard.tsx`)
- **Purpose**: Form for editing a single segment
- **Responsibilities**:
  - Segment type selector (TRANSFER, BUS, RAIL, FLIGHT, LAYOVER, STOP)
  - Origin/destination location inputs (can be destination_id or free text)
  - Date/time pickers
  - Timezone selectors
  - Metadata fields (flight number, airline, parking, etc.)
- **Features**:
  - **AutocompleteInput** for locations (searches destinations + free text)
  - **Conditional fields** based on segment type (e.g., flight details only for FLIGHT)
  - **Timezone inheritance** - destination timezone propagates to next segment
- **Data Structure**:
  ```typescript
  interface JourneySegmentDraft {
    segment_type: SegmentType;
    origin: LocationRef;          // { type, destination_id?, name }
    destination: LocationRef;
    start_datetime?: string;
    end_datetime?: string;
    origin_timezone?: string;
    destination_timezone?: string;
    metadata: Record<string, any>;
    notes?: string;
    order: number;
  }
  ```

### 5. **SegmentOptionsManager** (`frontend/components/journey-segments/SegmentOptionsManager.tsx`)
- **Purpose**: Manage transport alternatives for a segment
- **Responsibilities**:
  - Display list of options (e.g., "Airlink Express", "Taxi", "Uber")
  - Add/edit/delete transport options
  - Track status (researching, selected, booked, rejected)
  - Store provider details, frequency, cost, booking URLs
- **Use Case**: User is planning an airport transfer and wants to compare:
  - Bus (Airlink Express) - €7.50, every 15 min
  - Taxi - €30, on-demand
  - Uber - €25, app-based
- **Data Structure**:
  ```typescript
  interface SegmentOption {
    id: number;
    segment_id: number;
    name: string;
    provider?: string;
    frequency?: string;          // "Every 15 min", "Hourly"
    estimated_duration?: number; // minutes
    cost?: number;
    currency: string;
    booking_url?: string;
    notes?: string;
    status: 'researching' | 'selected' | 'booked' | 'rejected';
    order: number;
  }
  ```

### 6. **useSegmentBuilder** (`frontend/components/journey-segments/useSegmentBuilder.ts`)
- **Purpose**: Hook providing segment building logic and smart defaults
- **Key Features**:
  - **Timezone inheritance**: When setting a flight's `destination_timezone`, auto-populates the next segment's `origin_timezone` if locations match
  - **Template generation**: Creates segment arrays from intents (e.g., AIR_TRAVEL = [TRANSFER, FLIGHT, LAYOVER, FLIGHT, TRANSFER])
  - **Location matching**: Detects when adjacent segments share locations to propagate data
- **Methods**:
  - `applyIntent(intent)` - Generate template from intent
  - `addSegment()` - Add blank segment with inherited timezone
  - `updateLocation(index, side, location)` - Update origin/destination and sync adjacent segments
  - `updateField(index, field, value)` - Update any field with auto-propagation logic

---

## Data Flow: Creating a Journey

### Step-by-Step Flow

1. **User navigates to "Create Journey"**
   - Page: `/trips/[tripId]/journeys/new`
   - Component: `SegmentBuilder` rendered

2. **User selects journey intent**
   - User clicks "Air Travel with Layover"
   - `useSegmentBuilder.applyIntent('AIR_LAYOVER')` called
   - Template generated:
     ```typescript
     [
       { type: 'TRANSFER', origin: 'Home', destination: 'Airport' },
       { type: 'FLIGHT', origin: 'Airport', destination: 'Hub' },
       { type: 'LAYOVER', origin: 'Hub', destination: 'Hub' },
       { type: 'FLIGHT', origin: 'Hub', destination: 'Final' },
       { type: 'TRANSFER', origin: 'Airport', destination: 'Hotel' }
     ]
     ```

3. **User fills in segment details**
   - For each segment card:
     - Selects origin/destination (from dropdown or types custom location)
     - Enters dates/times
     - Selects timezones
     - Adds flight details (for FLIGHT type)
   
4. **Smart defaults auto-fill**
   - User sets Flight 1 destination timezone to "Europe/Dublin"
   - Layover origin timezone auto-fills "Europe/Dublin"
   - User sets Layover destination timezone to "Europe/Dublin"
   - Flight 2 origin timezone auto-fills "Europe/Dublin"

5. **User saves journey**
   - Clicks "Save Journey"
   - Frontend converts `JourneySegmentDraft[]` to API payloads
   - For each segment:
     ```typescript
     const payload = {
       journey_id: journeyId,
       segment_type: draft.segment_type,
       origin_id: draft.origin.destination_id,
       origin_name: draft.origin.name,
       destination_id: draft.destination.destination_id,
       destination_name: draft.destination.name,
       start_datetime: draft.start_datetime,
       end_datetime: draft.end_datetime,
       origin_timezone: draft.origin_timezone,
       destination_timezone: draft.destination_timezone,
       metadata: JSON.stringify(draft.metadata),
       order: index
     };
     await journeySegmentApi.create(journeyId, payload);
     ```

6. **Backend processes request**
   - Router: `POST /journeys/{journey_id}/segments`
   - Service: `journey_segment_service.create_journey_segment()`
   - Validation:
     - Verify journey exists
     - Verify destination_id exists (if provided)
   - Database: INSERT into journey_segments table
   - Response: Returns created segment with ID

7. **User adds transport options** (for TRANSFER segments)
   - Opens segment for editing
   - Clicks "Add Option" in SegmentOptionsManager
   - Enters: "Airlink Express", provider "Dublin Bus", cost €7.50
   - Saves option
   - Backend: `POST /segment-options/`
   - Database: INSERT into segment_options table

---

## Data Flow: Managing Segments

### Viewing Segments

```
SegmentManager mounts
  ↓
useEffect(() => { loadSegments() }, [journeyId])
  ↓
journeySegmentApi.getByJourneyId(journeyId)
  ↓
GET /journeys/{journey_id}/segments
  ↓
Backend: journey_segment_service.get_journey_segments()
  ↓
Database: SELECT * FROM journey_segments WHERE journey_id = ? ORDER BY order
  ↓
Service deserializes JSON: metadata_json → metadata object
  ↓
Response: JourneySegment[]
  ↓
Frontend: setSegments(response.data)
  ↓
Render: SegmentCard for each segment
```

### Editing a Segment

```
User clicks "Edit" on segment card
  ↓
SegmentManager.openEditor(segment)
  ↓
setEditingSegment(segment)
  ↓
Convert to draft: toDraft(segment)
  ↓
If TRANSFER/BUS/RAIL: loadSegmentOptions(segment.id)
  ↓
GET /segment-options/segment/{segment_id}
  ↓
Backend: segment_option_service.get_segment_options()
  ↓
Response: SegmentOption[]
  ↓
setSegmentOptions(response.data)
  ↓
Render modal with SegmentCard + SegmentOptionsManager
  ↓
User edits fields
  ↓
User clicks "Save"
  ↓
journeySegmentApi.update(segmentId, payload)
  ↓
PUT /journey-segments/{segment_id}
  ↓
Backend: journey_segment_service.update_journey_segment()
  ↓
Database: UPDATE journey_segments SET ... WHERE id = ?
  ↓
Response: Updated segment
  ↓
Frontend: Update segments array, close modal
```

### Deleting a Segment

```
User clicks "Delete" on segment
  ↓
Confirm dialog: "Delete this segment?"
  ↓
journeySegmentApi.delete(segmentId)
  ↓
DELETE /journey-segments/{segment_id}
  ↓
Backend: journey_segment_service.delete_journey_segment()
  ↓
Database: DELETE FROM journey_segments WHERE id = ?
  ↓
Database: CASCADE DELETE segment_options WHERE segment_id = ?
  ↓
Response: 204 No Content
  ↓
Frontend: Remove segment from array, reload list
```

---

## Data Flow: Segment Options

### Creating a Transport Option

```
User editing TRANSFER segment
  ↓
Clicks "+ Add Option" in SegmentOptionsManager
  ↓
Opens option form
  ↓
User enters:
  - Name: "Airlink Express"
  - Provider: "Dublin Bus"
  - Frequency: "Every 15 min"
  - Duration: 30 min
  - Cost: €7.50
  - Booking URL: https://...
  - Notes: "Cheaper than taxi"
  - Status: "researching"
  ↓
Clicks "Add"
  ↓
segmentOptionApi.create(formData)
  ↓
POST /segment-options/
  ↓
Backend: segment_option_service.create_segment_option()
  ↓
Validation: Verify segment exists
  ↓
Database: INSERT INTO segment_options (...)
  ↓
Response: SegmentOption with ID
  ↓
Frontend: Add to segmentOptions array
```

### Updating Option Status

```
User clicks checkmark icon on option (mark as "selected")
  ↓
handleSelectOption(option)
  ↓
segmentOptionApi.update(optionId, { status: 'selected' })
  ↓
PUT /segment-options/{option_id}
  ↓
Backend: segment_option_service.update_segment_option()
  ↓
Database: UPDATE segment_options SET status = 'selected' WHERE id = ?
  ↓
Response: Updated option
  ↓
Frontend: Update option in array (shows green badge)
```

### Deleting an Option

```
User clicks X icon on option
  ↓
Confirm dialog
  ↓
segmentOptionApi.delete(optionId)
  ↓
DELETE /segment-options/{option_id}
  ↓
Backend: segment_option_service.delete_segment_option()
  ↓
Database: DELETE FROM segment_options WHERE id = ?
  ↓
Response: 204 No Content
  ↓
Frontend: Remove from array
```

---

## API Layer

### Frontend API Client (`frontend/lib/api.ts`)

```typescript
// Journey Segment API
export const journeySegmentApi = {
  // GET /journeys/{journey_id}/segments
  getByJourneyId: (journeyId: number) =>
    api.get<JourneySegment[]>(`/journeys/${journeyId}/segments`),
  
  // GET /journey-segments/{segment_id}
  getById: (segmentId: number) =>
    api.get<JourneySegment>(`/journey-segments/${segmentId}`),
  
  // POST /journeys/{journey_id}/segments
  create: (journeyId: number, data: Omit<JourneySegment, 'id'>) =>
    api.post<JourneySegment>(`/journeys/${journeyId}/segments`, data),
  
  // PUT /journey-segments/{segment_id}
  update: (segmentId: number, data: Partial<JourneySegment>) =>
    api.put<JourneySegment>(`/journey-segments/${segmentId}`, data),
  
  // DELETE /journey-segments/{segment_id}
  delete: (segmentId: number) => 
    api.delete(`/journey-segments/${segmentId}`),
};

// Segment Option API
export const segmentOptionApi = {
  // GET /segment-options/segment/{segment_id}
  getBySegmentId: (segmentId: number) =>
    api.get<SegmentOption[]>(`/segment-options/segment/${segmentId}`),
  
  // POST /segment-options/
  create: (data: SegmentOptionFormData) =>
    api.post<SegmentOption>('/segment-options/', data),
  
  // PUT /segment-options/{option_id}
  update: (optionId: number, data: Partial<SegmentOptionFormData>) =>
    api.put<SegmentOption>(`/segment-options/${optionId}`, data),
  
  // DELETE /segment-options/{option_id}
  delete: (optionId: number) => 
    api.delete(`/segment-options/${optionId}`),
};
```

### API Request/Response Examples

#### Create Segment
**Request:**
```http
POST /journeys/123/segments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "segment_type": "FLIGHT",
  "origin_id": 5,
  "origin_name": null,
  "destination_id": 8,
  "destination_name": null,
  "start_datetime": "2026-06-15T10:30:00",
  "end_datetime": "2026-06-15T14:45:00",
  "origin_timezone": "America/Denver",
  "destination_timezone": "Europe/Dublin",
  "metadata": {
    "airline": "Aer Lingus",
    "flight_number": "EI123",
    "confirmation_code": "ABC123"
  },
  "order": 1
}
```

**Response:**
```json
{
  "id": 456,
  "journey_id": 123,
  "segment_type": "FLIGHT",
  "origin_id": 5,
  "origin_name": "Denver International",
  "destination_id": 8,
  "destination_name": "Dublin Airport",
  "start_datetime": "2026-06-15T10:30:00",
  "end_datetime": "2026-06-15T14:45:00",
  "origin_timezone": "America/Denver",
  "destination_timezone": "Europe/Dublin",
  "metadata": {
    "airline": "Aer Lingus",
    "flight_number": "EI123",
    "confirmation_code": "ABC123"
  },
  "order": 1
}
```

#### Create Segment Option
**Request:**
```http
POST /segment-options/
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "segment_id": 458,
  "name": "Airlink Express",
  "provider": "Dublin Bus",
  "frequency": "Every 15 min",
  "estimated_duration": 30,
  "cost": 7.50,
  "currency": "EUR",
  "booking_url": "https://dublinexpress.ie",
  "notes": "Cheaper than taxi, more reliable than Uber",
  "status": "researching",
  "order": 0
}
```

**Response:**
```json
{
  "id": 12,
  "segment_id": 458,
  "name": "Airlink Express",
  "provider": "Dublin Bus",
  "frequency": "Every 15 min",
  "estimated_duration": 30,
  "cost": 7.50,
  "currency": "EUR",
  "booking_url": "https://dublinexpress.ie",
  "notes": "Cheaper than taxi, more reliable than Uber",
  "status": "researching",
  "order": 0
}
```

---

## Backend Services

### Journey Segment Service (`app/services/journey_segment_service.py`)

```python
def create_journey_segment(
    segment_data: schemas.JourneySegmentCreate,
    db: Session,
) -> schemas.JourneySegment:
    """Create a new journey segment"""
    # Verify journey exists
    journey = db.query(models.Journey).filter(
        models.Journey.id == segment_data.journey_id
    ).first()
    if not journey:
        raise ValueError("Journey not found")

    # Serialize metadata to JSON string
    metadata_json = None
    if segment_data.metadata is not None:
        metadata_json = json.dumps(segment_data.metadata)

    # Create database record
    data = segment_data.model_dump(exclude={"metadata"})
    db_segment = models.JourneySegment(
        **data,
        metadata_json=metadata_json,
    )
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    
    return _serialize_segment(db_segment)
```

**Key Responsibilities:**
- **Validation**: Verify journey exists, check foreign key constraints
- **JSON handling**: Serialize metadata dict to JSON string for database
- **Database-agnostic**: Handle both SQLite (returns string) and Postgres (returns dict) JSON columns
- **Deserialization**: Convert database model to Pydantic schema for API response

### Segment Option Service (`app/services/segment_option_service.py`)

```python
def create_segment_option(
    option_data: schemas.SegmentOptionCreate,
    db: Session,
) -> schemas.SegmentOption:
    """Create a new segment option"""
    # Verify segment exists
    segment = db.query(models.JourneySegment).filter(
        models.JourneySegment.id == option_data.segment_id
    ).first()
    if not segment:
        raise ValueError("Journey segment not found")

    # Create database record
    db_option = models.SegmentOption(**option_data.model_dump())
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    
    return schemas.SegmentOption.model_validate(db_option)
```

**Key Features:**
- **Foreign key validation**: Ensures segment exists before creating option
- **Ordering**: Options ordered by `order` field for consistent display
- **Status tracking**: Manages workflow (researching → selected → booked)

---

## Database Schema

### journey_segments Table

```sql
CREATE TABLE journey_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id INTEGER NOT NULL,
    segment_type VARCHAR(20) NOT NULL,  -- TRANSFER, BUS, RAIL, FLIGHT, LAYOVER, STOP
    
    -- Locations (flexible: either destination_id or free text name)
    origin_id INTEGER,                   -- FK to destinations.id (optional)
    origin_name VARCHAR(200),            -- Free text (e.g., "Home", "SFO Airport")
    destination_id INTEGER,              -- FK to destinations.id (optional)
    destination_name VARCHAR(200),       -- Free text
    
    -- Timestamps with timezone awareness
    start_datetime TIMESTAMP,
    end_datetime TIMESTAMP,
    origin_timezone VARCHAR(50),         -- IANA timezone (e.g., "America/Denver")
    destination_timezone VARCHAR(50),
    
    -- Flexible metadata as JSON
    metadata_json TEXT,                  -- Stores flight details, parking info, etc.
    
    -- Organization
    "order" INTEGER NOT NULL DEFAULT 0,  -- Display order within journey
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (origin_id) REFERENCES destinations(id) ON DELETE SET NULL,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL
);
```

**Metadata Examples:**

For **FLIGHT** segments:
```json
{
  "airline": "Aer Lingus",
  "flight_number": "EI123",
  "booking_reference": "ABC123",
  "confirmation_code": "XYZ789",
  "seat_number": "12A",
  "baggage_info": "1 checked bag"
}
```

For **TRANSFER** segments:
```json
{
  "parking_location": "Long-term Lot B",
  "parking_cost": 15.00,
  "parking_reservation": "PARK456"
}
```

### segment_options Table

```sql
CREATE TABLE segment_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER NOT NULL,        -- FK to journey_segments.id
    
    -- Option details
    name VARCHAR(200) NOT NULL,         -- "Airlink Express", "Taxi"
    provider VARCHAR(100),               -- "Dublin Bus", "Uber"
    frequency VARCHAR(100),              -- "Every 15 min", "On-demand"
    estimated_duration INTEGER,          -- Duration in minutes
    
    -- Cost information
    cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Booking details
    booking_url VARCHAR(500),
    notes TEXT,
    
    -- Status tracking (workflow)
    status VARCHAR(20) NOT NULL DEFAULT 'researching',
    -- Values: researching, selected, booked, rejected
    
    -- Display order
    "order" INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (segment_id) REFERENCES journey_segments(id) ON DELETE CASCADE
);
```

**Indexes:**
- `journey_segments.journey_id` - Fast lookup of all segments for a journey
- `segment_options.segment_id` - Fast lookup of options for a segment
- `journey_segments.order` - Efficient sorting

---

## Key Concepts

### 1. **Segment Types**

Each segment type has different fields and behaviors:

| Type | Description | Key Fields | Use Case |
|------|-------------|------------|----------|
| **TRANSFER** | Ground transport between locations | parking info, transport options | Drive to airport, hotel shuttle |
| **BUS** | Bus/coach travel | operator, route, seat | Intercity coach, airport bus |
| **RAIL** | Train travel | operator, route, seat | Amtrak, Eurostar |
| **FLIGHT** | Air travel | airline, flight number, seat | Commercial flights |
| **LAYOVER** | Airport connection time | terminal, lounge | Between connecting flights |
| **STOP** | Pause at a location | activities, notes | Sightseeing stop on road trip |

### 2. **Location References**

Journey segments use a **flexible location system**:

```typescript
interface LocationRef {
  type: 'destination' | 'custom';
  destination_id?: number;    // If type='destination'
  name?: string;              // Display name or custom location
}
```

**When to use destination_id:**
- Location is a planned trip destination (e.g., Paris, Tokyo)
- Enables linking to destination details (accommodation, activities)
- Allows weather lookups and timezone resolution

**When to use custom name:**
- Location is not a main destination (e.g., "Home", "DEN Airport", "Layover in London")
- Temporary stops or transit points
- Flexibility for any location

### 3. **Timezone Inheritance**

Smart default system to reduce manual entry:

1. User sets Flight 1 `destination_timezone` = "Europe/Paris"
2. System detects Flight 1 destination matches next segment's (Layover) origin
3. Auto-fills Layover `origin_timezone` = "Europe/Paris"
4. User sets Layover `destination_timezone` = "Europe/Paris"
5. System auto-fills Flight 2 `origin_timezone` = "Europe/Paris"

**Implementation:** `useSegmentBuilder.updateField()` checks if `field === 'destination_timezone'` and propagates to next segment if locations match.

### 4. **Journey Intents (Templates)**

Pre-built templates reduce setup time:

**SIMPLE** - Direct point-to-point:
```
[TRANSFER] Home → Destination
```

**AIR_TRAVEL** - Simple flight:
```
[TRANSFER] Home → Airport
[FLIGHT] Airport → Destination Airport
[TRANSFER] Destination Airport → Hotel
```

**AIR_LAYOVER** - Flight with connection:
```
[TRANSFER] Home → Airport
[FLIGHT] Airport → Hub
[LAYOVER] Hub → Hub
[FLIGHT] Hub → Final Airport
[TRANSFER] Final Airport → Hotel
```

**MULTI_STOP** - Road trip:
```
[STOP] Start → Stop 1
[STOP] Stop 1 → Stop 2
[STOP] Stop 2 → End
```

### 5. **Segment Options Workflow**

Status progression for transport research:

```
researching → selected → booked
                ↓
            rejected
```

- **researching**: Actively comparing options
- **selected**: Chosen this option, not yet booked
- **booked**: Confirmed and paid
- **rejected**: Ruled out this option

### 6. **Metadata Flexibility**

Instead of fixed columns for all segment-specific fields (flight number, seat, parking, etc.), we use a JSON `metadata` field. This allows:

- **Extensibility**: Add new fields without schema changes
- **Type-specific data**: Different segments need different fields
- **Complex structures**: Nested objects (e.g., baggage allowance details)

---

## Code Examples

### Example 1: Creating a Journey with Segments

```typescript
// User creates journey
const journey = await journeyApi.create({
  trip_id: 42,
  transport_mode: 'air',
  order: 0,
});

// Create segments from template
const segments: JourneySegmentDraft[] = [
  {
    segment_type: 'TRANSFER',
    origin: { type: 'custom', name: 'Home' },
    destination: { type: 'custom', name: 'Denver Airport' },
    origin_timezone: 'America/Denver',
    destination_timezone: 'America/Denver',
    metadata: { parking_location: 'Lot B' },
    order: 0,
  },
  {
    segment_type: 'FLIGHT',
    origin: { type: 'custom', name: 'Denver Airport' },
    destination: { type: 'destination', destination_id: 15, name: 'Dublin' },
    start_datetime: '2026-06-15T10:30:00',
    end_datetime: '2026-06-15T22:45:00',
    origin_timezone: 'America/Denver',
    destination_timezone: 'Europe/Dublin',
    metadata: {
      airline: 'Aer Lingus',
      flight_number: 'EI123',
      seat_number: '12A',
    },
    order: 1,
  },
  {
    segment_type: 'TRANSFER',
    origin: { type: 'custom', name: 'Dublin Airport' },
    destination: { type: 'destination', destination_id: 15, name: 'Dublin' },
    destination_timezone: 'Europe/Dublin',
    metadata: {},
    order: 2,
  },
];

// Save segments
for (const [index, segment] of segments.entries()) {
  await journeySegmentApi.create(journey.id, {
    journey_id: journey.id,
    segment_type: segment.segment_type,
    origin_id: segment.origin.destination_id,
    origin_name: segment.origin.name,
    destination_id: segment.destination.destination_id,
    destination_name: segment.destination.name,
    start_datetime: segment.start_datetime,
    end_datetime: segment.end_datetime,
    origin_timezone: segment.origin_timezone,
    destination_timezone: segment.destination_timezone,
    metadata: segment.metadata,
    order: index,
  });
}
```

### Example 2: Adding Transport Options to Transfer

```typescript
// User created a TRANSFER segment for airport → hotel
const transferSegment = segments.find(s => s.segment_type === 'TRANSFER');

// Research transport options
const options = [
  {
    segment_id: transferSegment.id,
    name: 'Airlink Express',
    provider: 'Dublin Bus',
    frequency: 'Every 15 min',
    estimated_duration: 30,
    cost: 7.50,
    currency: 'EUR',
    booking_url: 'https://dublinexpress.ie',
    notes: 'Cheapest option, reliable',
    status: 'researching',
    order: 0,
  },
  {
    segment_id: transferSegment.id,
    name: 'Taxi',
    provider: null,
    frequency: 'On-demand',
    estimated_duration: 25,
    cost: 35.00,
    currency: 'EUR',
    notes: 'Door-to-door, expensive',
    status: 'researching',
    order: 1,
  },
  {
    segment_id: transferSegment.id,
    name: 'Uber',
    provider: 'Uber',
    frequency: 'On-demand (app)',
    estimated_duration: 25,
    cost: 28.00,
    currency: 'EUR',
    notes: 'Middle price, convenient',
    status: 'selected', // User chose this
    order: 2,
  },
];

// Save all options
for (const option of options) {
  await segmentOptionApi.create(option);
}
```

### Example 3: Editing a Segment in SegmentManager

```typescript
const SegmentManager = ({ journeyId }: Props) => {
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [editingSegment, setEditingSegment] = useState<JourneySegment | null>(null);
  const [editingDraft, setEditingDraft] = useState<JourneySegmentDraft | null>(null);
  const [segmentOptions, setSegmentOptions] = useState<SegmentOption[]>([]);

  const openEditor = (segment: JourneySegment) => {
    setEditingSegment(segment);
    setEditingDraft(toDraft(segment));
    
    // Load options if TRANSFER/BUS/RAIL
    if (['TRANSFER', 'BUS', 'RAIL'].includes(segment.segment_type)) {
      loadSegmentOptions(segment.id);
    }
  };

  const loadSegmentOptions = async (segmentId: number) => {
    const response = await segmentOptionApi.getBySegmentId(segmentId);
    setSegmentOptions(response.data);
  };

  const handleSave = async () => {
    if (!editingSegment || !editingDraft) return;

    const response = await journeySegmentApi.update(
      editingSegment.id,
      toUpdatePayload(editingDraft)
    );
    
    setSegments(prev =>
      prev.map(s => s.id === editingSegment.id ? response.data : s)
    );
    closeEditor();
  };

  return (
    <>
      {segments.map(segment => (
        <SegmentCard
          key={segment.id}
          segment={segment}
          onEdit={() => openEditor(segment)}
          onDelete={() => handleDelete(segment.id)}
        />
      ))}

      {editingSegment && editingDraft && (
        <Modal onClose={closeEditor}>
          <SegmentCard
            segment={editingDraft}
            index={editingSegment.order}
            onUpdateType={(type) => updateDraftField('segment_type', type)}
            onUpdateLocation={(side, loc) => updateDraftLocation(side, loc)}
            onUpdateField={(field, value) => updateDraftField(field, value)}
          />
          
          {['TRANSFER', 'BUS', 'RAIL'].includes(editingSegment.segment_type) && (
            <SegmentOptionsManager
              segmentId={editingSegment.id}
              options={segmentOptions}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
            />
          )}
        </Modal>
      )}
    </>
  );
};
```

---

## Strategic Improvements & Considerations

While the current architecture is solid, several enhancements would make it production-ready and user-friendly.

### A. Gap Validation (Location & Time Continuity)

**Problem:** Users can create invalid journey flows where:
- Segment 1 ends at Heathrow (LHR) at 10:00 AM
- Segment 2 starts at Gatwick (LGW) at 11:00 AM (different airport!)
- Or arrival time overlaps with departure time

**Status:** ❌ Not Implemented

**Proposed Solution:** Add validation in `journey_segment_service.py`:

```python
from datetime import datetime
from typing import List, Optional

def validate_segment_continuity(
    segments: List[schemas.JourneySegment]
) -> List[dict]:
    """
    Validate that segments form a continuous journey.
    
    Returns a list of warnings/errors:
    - Location mismatches between adjacent segments
    - Time gaps or overlaps
    """
    issues = []
    
    # Sort by order
    sorted_segments = sorted(segments, key=lambda s: s.order)
    
    for i in range(len(sorted_segments) - 1):
        current = sorted_segments[i]
        next_seg = sorted_segments[i + 1]
        
        # Check location continuity
        current_dest = current.destination_name or (
            current.destination_id and f"Destination #{current.destination_id}"
        )
        next_origin = next_seg.origin_name or (
            next_seg.origin_id and f"Destination #{next_seg.origin_id}"
        )
        
        if current.destination_id != next_seg.origin_id:
            if current.destination_name != next_seg.origin_name:
                issues.append({
                    "type": "location_gap",
                    "severity": "warning",
                    "segment_1": current.order,
                    "segment_2": next_seg.order,
                    "message": f"Segment {current.order} ends at '{current_dest}' but "
                               f"Segment {next_seg.order} starts at '{next_origin}'",
                })
        
        # Check time continuity (if both have times)
        if current.end_datetime and next_seg.start_datetime:
            if next_seg.start_datetime < current.end_datetime:
                issues.append({
                    "type": "time_overlap",
                    "severity": "error",
                    "segment_1": current.order,
                    "segment_2": next_seg.order,
                    "message": f"Segment {next_seg.order} starts before Segment {current.order} ends",
                })
            
            # Warn if gap is more than 6 hours (configurable)
            gap_hours = (next_seg.start_datetime - current.end_datetime).total_seconds() / 3600
            if gap_hours > 6:
                issues.append({
                    "type": "time_gap",
                    "severity": "warning",
                    "segment_1": current.order,
                    "segment_2": next_seg.order,
                    "gap_hours": round(gap_hours, 1),
                    "message": f"{round(gap_hours, 1)} hour gap between segments",
                })
    
    return issues


def get_journey_segments_with_validation(
    journey_id: int, db: Session
) -> dict:
    """Get segments and include validation warnings"""
    segments = get_journey_segments(journey_id, db)
    issues = validate_segment_continuity(segments)
    
    return {
        "segments": segments,
        "validation": {
            "is_valid": not any(i["severity"] == "error" for i in issues),
            "issues": issues,
        }
    }
```

**API Endpoint:**
```python
# In journey_segments router
@router.get("/journeys/{journey_id}/segments/validate")
def validate_journey_segments(
    journey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get segments with continuity validation"""
    result = journey_segment_service.get_journey_segments_with_validation(
        journey_id, db
    )
    return result
```

**Frontend Integration:**
```typescript
// In SegmentManager component
useEffect(() => {
  const validateSegments = async () => {
    const result = await journeySegmentApi.validateSegments(journeyId);
    
    if (result.validation.issues.length > 0) {
      // Show warnings/errors in UI
      setValidationIssues(result.validation.issues);
    }
  };
  
  validateSegments();
}, [segments]);
```

---

### B. Return Journey / Duplicate & Reverse Segments

**Problem:** Users want to create a return journey by duplicating outbound segments and reversing them.

**Status:** ⚠️ Partially Implemented (exists for old Journey model, not for segments)

**Current Implementation:** `useJourneyForm.ts` has `duplicateAsReturn()` but only for flat Journey records.

**Proposed Solution:** Add segment-level duplication:

```typescript
// In useSegmentBuilder or new hook
const duplicateAsReturnJourney = async (
  sourceJourneyId: number
): Promise<number> => {
  // 1. Create new journey
  const sourceJourney = await journeyApi.getById(sourceJourneyId);
  const returnJourney = await journeyApi.create({
    trip_id: sourceJourney.trip_id,
    // Swap origin/destination
    origin_id: sourceJourney.destination_id,
    destination_id: sourceJourney.origin_id,
    origin_name: sourceJourney.destination_name,
    destination_name: sourceJourney.origin_name,
    transport_mode: sourceJourney.transport_mode,
    status: 'planned',
  });

  // 2. Get source segments
  const sourceSegments = await journeySegmentApi.getByJourneyId(sourceJourneyId);

  // 3. Reverse segments
  const reversedSegments = [...sourceSegments].reverse();

  // 4. Create new segments with swapped locations
  for (const [index, segment] of reversedSegments.entries()) {
    await journeySegmentApi.create(returnJourney.id, {
      journey_id: returnJourney.id,
      segment_type: segment.segment_type,
      // Swap origin and destination
      origin_id: segment.destination_id,
      origin_name: segment.destination_name,
      destination_id: segment.origin_id,
      destination_name: segment.origin_name,
      // Swap timezones
      origin_timezone: segment.destination_timezone,
      destination_timezone: segment.origin_timezone,
      // Clear date/times (user will fill in)
      start_datetime: null,
      end_datetime: null,
      // Keep metadata as template
      metadata: segment.metadata,
      order: index,
    });
  }

  return returnJourney.id;
};
```

**Backend Helper (Optional Optimization):**
```python
# In journey_segment_service.py
def duplicate_segments_as_return(
    source_journey_id: int,
    target_journey_id: int,
    db: Session,
) -> List[schemas.JourneySegment]:
    """
    Duplicate all segments from source journey to target,
    reversing order and swapping origin/destination.
    """
    source_segments = get_journey_segments(source_journey_id, db)
    reversed_segments = list(reversed(source_segments))
    
    created = []
    for index, segment in enumerate(reversed_segments):
        new_segment = schemas.JourneySegmentCreate(
            journey_id=target_journey_id,
            segment_type=segment.segment_type,
            # Swap locations
            origin_id=segment.destination_id,
            origin_name=segment.destination_name,
            destination_id=segment.origin_id,
            destination_name=segment.origin_name,
            # Swap timezones
            origin_timezone=segment.destination_timezone,
            destination_timezone=segment.origin_timezone,
            # Clear timestamps
            start_datetime=None,
            end_datetime=None,
            # Keep metadata as reference
            metadata=segment.metadata,
            order=index,
        )
        created.append(create_journey_segment(new_segment, db))
    
    return created
```

---

### C. Polymorphic Metadata Validation

**Problem:** Currently `metadata` is a generic `dict`. No type safety ensures FLIGHT segments have `flight_number` or TRANSFER segments have parking details.

**Status:** ❌ Not Implemented

**Proposed Solution:** Use Pydantic Discriminated Unions:

```python
# In app/schemas/journey_segment.py
from typing import Literal, Union
from pydantic import BaseModel, Field

# Metadata schemas per segment type
class FlightMetadata(BaseModel):
    airline: str
    flight_number: str
    booking_reference: Optional[str] = None
    confirmation_code: Optional[str] = None
    seat_number: Optional[str] = None
    baggage_info: Optional[str] = None
    terminal: Optional[str] = None


class TransferMetadata(BaseModel):
    parking_location: Optional[str] = None
    parking_cost: Optional[float] = None
    parking_reservation: Optional[str] = None
    vehicle_type: Optional[str] = None  # "personal", "rental", "uber"


class RailMetadata(BaseModel):
    operator: str
    train_number: Optional[str] = None
    seat_number: Optional[str] = None
    coach: Optional[str] = None
    booking_reference: Optional[str] = None


class BusMetadata(BaseModel):
    operator: str
    route_number: Optional[str] = None
    seat_number: Optional[str] = None
    booking_reference: Optional[str] = None


class LayoverMetadata(BaseModel):
    terminal: Optional[str] = None
    lounge_access: Optional[bool] = None
    lounge_name: Optional[str] = None
    notes: Optional[str] = None


class StopMetadata(BaseModel):
    activities: Optional[str] = None
    notes: Optional[str] = None


# Discriminated union schema
class JourneySegmentTyped(BaseModel):
    segment_type: Literal["FLIGHT", "TRANSFER", "RAIL", "BUS", "LAYOVER", "STOP"]
    metadata: Union[
        FlightMetadata,
        TransferMetadata,
        RailMetadata,
        BusMetadata,
        LayoverMetadata,
        StopMetadata,
    ] = Field(discriminator="segment_type")

    model_config = ConfigDict(use_enum_values=True)
```

**Alternative: Runtime Validation Helper:**
```python
def validate_segment_metadata(segment_type: str, metadata: dict) -> dict:
    """Validate metadata matches segment type requirements"""
    validators = {
        "FLIGHT": FlightMetadata,
        "TRANSFER": TransferMetadata,
        "RAIL": RailMetadata,
        "BUS": BusMetadata,
        "LAYOVER": LayoverMetadata,
        "STOP": StopMetadata,
    }
    
    validator_class = validators.get(segment_type)
    if validator_class:
        # Validates and returns clean data
        return validator_class(**metadata).model_dump()
    
    return metadata  # Unknown type, pass through
```

---

### D. Order Re-indexing on Delete

**Problem:** When user deletes Segment 2 of 5, segments 3, 4, 5 keep their original order values (2, 3, 4), creating a gap.

**Status:** ❌ Not Implemented

**Proposed Solution:** Auto-reindex after deletion:

```python
# In journey_segment_service.py
def delete_journey_segment(segment_id: int, db: Session) -> bool:
    segment = (
        db.query(models.JourneySegment)
        .filter(models.JourneySegment.id == segment_id)
        .first()
    )
    if not segment:
        raise ValueError("Journey segment not found")

    journey_id = segment.journey_id
    deleted_order = segment.order
    
    # Delete the segment
    db.delete(segment)
    db.commit()
    
    # Reindex remaining segments with higher order
    remaining = (
        db.query(models.JourneySegment)
        .filter(
            models.JourneySegment.journey_id == journey_id,
            models.JourneySegment.order > deleted_order
        )
        .all()
    )
    
    for seg in remaining:
        seg.order -= 1
    
    db.commit()
    return True


def reorder_journey_segments(
    journey_id: int,
    segment_id_order: List[int],  # New order: [seg_id_3, seg_id_1, seg_id_2]
    db: Session,
) -> List[schemas.JourneySegment]:
    """
    Reorder segments based on provided ID list.
    Useful for drag-and-drop reordering in UI.
    """
    for new_order, segment_id in enumerate(segment_id_order):
        segment = (
            db.query(models.JourneySegment)
            .filter(models.JourneySegment.id == segment_id)
            .first()
        )
        if segment:
            segment.order = new_order
    
    db.commit()
    return get_journey_segments(journey_id, db)
```

**API Endpoint:**
```python
@router.put("/journeys/{journey_id}/segments/reorder")
def reorder_segments(
    journey_id: int,
    segment_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder segments by providing new order of IDs"""
    return journey_segment_service.reorder_journey_segments(
        journey_id, segment_ids, db
    )
```

---

### E. Testing Recommendations

**Critical Tests to Add:**

#### 1. Cascade Delete Test
```python
# tests/test_journey_segments.py
def test_cascade_delete_journey_deletes_segments(client, db_setup, auth_headers):
    """When journey is deleted, all segments and options should be removed"""
    # Create journey with segments and options
    journey = create_test_journey()
    segment = create_test_segment(journey.id)
    option = create_test_option(segment.id)
    
    # Delete journey
    response = client.delete(f"/journeys/{journey.id}", headers=auth_headers)
    assert response.status_code == 204
    
    # Verify cascade
    segments = db.query(JourneySegment).filter_by(journey_id=journey.id).all()
    assert len(segments) == 0
    
    options = db.query(SegmentOption).filter_by(segment_id=segment.id).all()
    assert len(options) == 0
```

#### 2. JSON Serialization Test (SQLite vs Postgres)
```python
def test_metadata_serialization_sqlite(client, db_setup, auth_headers):
    """Metadata should correctly serialize/deserialize in SQLite"""
    metadata = {
        "airline": "Aer Lingus",
        "flight_number": "EI123",
        "seat_number": "12A"
    }
    
    # Create segment
    response = client.post(
        f"/journeys/{journey_id}/segments",
        json={"segment_type": "FLIGHT", "metadata": metadata, ...},
        headers=auth_headers
    )
    segment_id = response.json()["id"]
    
    # Retrieve and verify
    response = client.get(f"/journey-segments/{segment_id}", headers=auth_headers)
    assert response.json()["metadata"]["airline"] == "Aer Lingus"
    assert isinstance(response.json()["metadata"], dict)  # Not string!
```

#### 3. Order Re-indexing Test
```python
def test_delete_segment_reindexes_order(client, db_setup, auth_headers):
    """Deleting a segment should reindex remaining segments"""
    # Create 5 segments (order 0-4)
    segments = [create_test_segment(journey_id, order=i) for i in range(5)]
    
    # Delete segment at order=2
    client.delete(f"/journey-segments/{segments[2].id}", headers=auth_headers)
    
    # Verify remaining segments have orders [0, 1, 2, 3] (no gap at 2)
    response = client.get(f"/journeys/{journey_id}/segments", headers=auth_headers)
    orders = [s["order"] for s in response.json()]
    assert orders == [0, 1, 2, 3]
```

#### 4. Gap Validation Test
```python
def test_segment_gap_validation_warns_location_mismatch(client, db_setup):
    """Validation should flag when segments don't connect"""
    # Segment 1: Home -> Airport A
    # Segment 2: Airport B -> Hotel (different airport!)
    
    response = client.get(
        f"/journeys/{journey_id}/segments/validate",
        headers=auth_headers
    )
    
    validation = response.json()["validation"]
    assert validation["is_valid"] == True  # Warning, not error
    assert len(validation["issues"]) == 1
    assert validation["issues"][0]["type"] == "location_gap"
```

---

### F. UI Enhancements

#### Sub-Form Encapsulation
To avoid one giant form, each SegmentCard should manage its own validation:

```typescript
// SegmentCard.tsx
const SegmentCard = ({ segment, onChange }: Props) => {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  const validateSegment = (data: JourneySegmentDraft): boolean => {
    const errors: Record<string, string> = {};
    
    if (!data.origin.name && !data.origin.destination_id) {
      errors.origin = "Origin is required";
    }
    
    if (!data.destination.name && !data.destination.destination_id) {
      errors.destination = "Destination is required";
    }
    
    if (data.segment_type === 'FLIGHT' && !data.metadata?.flight_number) {
      errors.flight_number = "Flight number required for flights";
    }
    
    setLocalErrors(errors);
    const valid = Object.keys(errors).length === 0;
    setIsValid(valid);
    
    // Report validity to parent
    onChange({ ...data, __isValid: valid });
    
    return valid;
  };

  return (
    <div className={`segment-card ${!isValid ? 'border-red-500' : ''}`}>
      {/* Form fields */}
      {localErrors.origin && (
        <p className="text-red-500 text-sm">{localErrors.origin}</p>
      )}
    </div>
  );
};
```

---

### G. Activities & Expenses Integration

**Problem:** STOP segments exist but are "empty shells" - users can create them but cannot plan activities, meals, or expenses for those stops, defeating the purpose of road trip planning.

**Status:** ❌ Not Implemented (See [Feature 021](features/021-segment-activities-integration.md) for full implementation plan)

**Current State:**
- Activities are only linked to Destinations
- Expenses can link to Trip/Destination/Activity but not Segments
- Legacy JourneyStop system has StopOption for planning activities but isn't integrated with segments
- No way to track segment-specific expenses (flight costs, parking fees, transfer costs)

**Proposed Solution:** Extend Activity and Expense models with optional `segment_id`:

```python
# Add to Activity model
class Activity:
    destination_id: FK          # Existing (required)
    segment_id: FK (optional)   # NEW - Link to JourneySegment

# Add to Expense model
class Expense:
    trip_id: FK
    destination_id: FK (optional)
    activity_id: FK (optional)
    segment_id: FK (optional)   # NEW - Link to JourneySegment
```

**Benefits by Segment Type:**
| Segment Type | Use Cases |
|--------------|-----------|
| **STOP** | Plan meals, sightseeing, hikes at road trip stops |
| **FLIGHT** | Track flight costs, baggage fees, lounge expenses |
| **TRANSFER** | Record Uber costs, parking fees, airport shopping |
| **RAIL/BUS** | Track ticket costs, station meals, seat upgrades |
| **LAYOVER** | Plan terminal dining, duty-free shopping |

**Frontend Integration:**
```typescript
// In SegmentManager, when editing STOP segment
{editingSegment.segment_type === 'STOP' && (
  <>
    <ActivityPanel
      segmentId={editingSegment.id}
      activities={segmentActivities}
      onAddActivity={handleAddActivity}
    />
    
    <ExpensePanel
      segmentId={editingSegment.id}
      expenses={segmentExpenses}
      onAddExpense={handleAddExpense}
    />
  </>
)}
```

**Implementation Phases:**
1. **Phase 1:** Database migration - Add `segment_id` to Activity and Expense tables
2. **Phase 2:** Backend API - New endpoints for segment activities/expenses
3. **Phase 3:** Frontend UI - ActivityPanel and ExpensePanel in SegmentManager
4. **Phase 4:** Migration - Convert legacy JourneyStop data to STOP segments

**Estimated Effort:** 3-4 days

**See Full Plan:** [Feature 021: Segment Activities & Expenses Integration](features/021-segment-activities-integration.md)

---

## Summary

The Journey Segments system provides a flexible, hierarchical way to plan complex travel itineraries. Key design principles:

1. **Flexibility**: Mix destination references and free text locations
2. **Smart Defaults**: Timezone and data inheritance reduce manual entry
3. **Research Support**: Segment options allow comparing transport alternatives before booking
4. **Type Safety**: TypeScript interfaces ensure data consistency across frontend
5. **Database Agnostic**: Service layer handles SQLite/Postgres differences
6. **Extensibility**: JSON metadata allows type-specific fields without schema changes

**Current Implementation Status:**
- ✅ **Cascade Deletes**: Implemented via SQLAlchemy relationship
- ✅ **JSON Serialization**: Service layer handles SQLite/Postgres differences
- ⚠️ **Return Journey**: Partial (exists for old Journey model, needs segment support)
- ❌ **Activities & Expenses Integration**: Not implemented (high priority - see Feature 021)
- ❌ **Gap Validation**: Not implemented (high priority)
- ❌ **Polymorphic Metadata**: No type-safe validation per segment type
- ❌ **Order Re-indexing**: Delete doesn't auto-reindex

**Data flows from:**
- User interaction (SegmentCard, SegmentBuilder)
- Through React state management (hooks, context)
- Via API client (Axios with JWT auth)
- To FastAPI routers (endpoints with validation)
- Through service layer (business logic)
- Into SQLAlchemy ORM (database abstraction)
- Stored in relational database (SQLite dev, Postgres prod)

This architecture supports complex travel planning while maintaining clean separation of concerns and type safety throughout the stack. The strategic improvements outlined above would enhance robustness, user experience, and data integrity.
