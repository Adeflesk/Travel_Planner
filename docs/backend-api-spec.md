# FastAPI Backend Refactoring Plan

## Overview

Refactor the monolithic FastAPI backend (677-line main.py, 299-line schemas.py, 164-line models.py) into a modular, maintainable structure with proper file organization and documentation comments.

## Current State

- **main.py**: 33 endpoints in single file, organized by comment sections
- **schemas.py**: 23 Pydantic models in single file
- **models.py**: 6 SQLAlchemy models in single file
- **database.py**: Simple database setup (keep mostly as-is)
- **test_main.py**: 63 tests, well-organized

## Target Structure

```
Travel_Planner/
├── app/
│   ├── __init__.py              # App package init
│   ├── main.py                  # App factory, router registration, middleware
│   ├── config.py                # Configuration settings
│   ├── database.py              # Database setup (moved from root)
│   │
│   ├── models/
│   │   ├── __init__.py          # Re-exports all models
│   │   ├── base.py              # Base class
│   │   ├── trip.py              # Trip model
│   │   ├── destination.py       # Destination model
│   │   ├── activity.py          # Activity model
│   │   ├── expense.py           # Expense model
│   │   ├── packing_item.py      # PackingItem model
│   │   └── journey.py           # Journey model
│   │
│   ├── schemas/
│   │   ├── __init__.py          # Re-exports all schemas
│   │   ├── trip.py              # TripBase, TripCreate, TripUpdate, Trip
│   │   ├── destination.py       # Destination schemas
│   │   ├── activity.py          # Activity schemas
│   │   ├── expense.py           # Expense schemas + ExpenseSummary
│   │   ├── packing_item.py      # PackingItem schemas + PackingSummary
│   │   ├── journey.py           # Journey schemas
│   │   └── aggregates.py        # TripProgress, TimelineItem, DestinationWithActivities, etc.
│   │
│   ├── routers/
│   │   ├── __init__.py          # Re-exports all routers
│   │   ├── health.py            # Health check endpoint
│   │   ├── trips.py             # Trip CRUD + trip-level aggregates
│   │   ├── destinations.py      # Destination CRUD
│   │   ├── activities.py        # Activity CRUD
│   │   ├── expenses.py          # Expense CRUD
│   │   ├── packing.py           # PackingItem CRUD
│   │   └── journeys.py          # Journey CRUD
│   │
│   └── services/
│       ├── __init__.py
│       ├── expense_service.py   # Expense summary calculations
│       ├── packing_service.py   # Packing summary calculations
│       ├── activity_service.py  # Activity progress calculations
│       └── timeline_service.py  # Timeline merging logic
│
├── tests/                       # Keep existing structure, update imports
│   └── test_main.py             # Update to use new module structure
│
├── main.py                      # Entry point (imports from app/)
├── models.py                    # DEPRECATED: redirect imports
├── schemas.py                   # DEPRECATED: redirect imports
└── database.py                  # DEPRECATED: redirect imports
```

## File Header Comment Format

Each file will include a docstring at the top:

```python
"""
<module_name>.py - <Brief description>

<Detailed description of what this file contains and its purpose>

Author: Travel Planner Team
"""
```

## Implementation Steps

### Step 1: Create Directory Structure

Create the `app/` directory with all subdirectories:

- `app/models/`
- `app/schemas/`
- `app/routers/`
- `app/services/`

### Step 2: Split Models (app/models/)

Extract each SQLAlchemy model to its own file:

| File | Contents |
|------|----------|
| `base.py` | Base declarative class |
| `trip.py` | Trip model |
| `destination.py` | Destination model |
| `activity.py` | Activity model |
| `expense.py` | Expense model |
| `packing_item.py` | PackingItem model |
| `journey.py` | Journey model |
| `__init__.py` | Re-export all models |

### Step 3: Split Schemas (app/schemas/)

Extract Pydantic schemas by domain:

| File | Contents |
|------|----------|
| `trip.py` | TripBase, TripCreate, TripUpdate, Trip |
| `destination.py` | DestinationBase, DestinationCreate, DestinationUpdate, Destination |
| `activity.py` | ActivityBase, ActivityCreate, ActivityUpdate, Activity |
| `expense.py` | ExpenseBase, ExpenseCreate, ExpenseUpdate, Expense, ExpenseSummary |
| `packing_item.py` | PackingItemBase, PackingItemCreate, PackingItemUpdate, PackingItem, PackingCategoryDetail, PackingSummary |
| `journey.py` | JourneyBase, JourneyCreate, JourneyUpdate, Journey |
| `aggregates.py` | TripProgress, DestinationWithActivities, TimelineItem, DestinationAccommodation |
| `__init__.py` | Re-export all schemas |

### Step 4: Create Routers (app/routers/)

Split endpoints into APIRouter modules:

| File | Endpoints | Tag |
|------|-----------|-----|
| `health.py` | GET /health | health |
| `trips.py` | CRUD /trips/, aggregates /trips/{id}/... | trips |
| `destinations.py` | CRUD /destinations/ | destinations |
| `activities.py` | CRUD /activities/ | activities |
| `expenses.py` | CRUD /expenses/ | expenses |
| `packing.py` | CRUD /packing-items/ | packing |
| `journeys.py` | CRUD /journeys/ | journeys |

### Step 5: Create Services (app/services/)

Extract business logic from routers:

| File | Functions |
|------|-----------|
| `expense_service.py` | `get_expense_summary(trip_id, db)` |
| `packing_service.py` | `get_packing_summary(trip_id, db)` |
| `activity_service.py` | `get_trip_progress(trip_id, db)`, `get_destinations_with_activities(trip_id, db)` |
| `timeline_service.py` | `get_timeline(trip_id, db)`, `get_accommodation_expenses(trip_id, db)` |

### Step 6: Create Main App (app/main.py)

Create the FastAPI application factory that:

- Creates FastAPI instance
- Configures CORS middleware
- Includes all routers
- Registers startup/shutdown events

### Step 7: Create Config (app/config.py)

Centralize configuration:

- Database URL
- CORS origins
- API version
- Debug mode

### Step 8: Update Entry Point (main.py at root)

Create simple entry point that imports from app/:

```python
from app.main import app
```

### Step 9: Create Backward Compatibility Files

Add redirect imports in root-level files for existing imports:

```python
# models.py
from app.models import *  # Backward compatibility
```

### Step 10: Update Tests

Update test imports to use new module paths while maintaining test structure.

## Verification

1. **Run all tests**: `pytest test_main.py -v`
2. **Check API docs**: Visit <http://localhost:8000/docs>
3. **Test each endpoint group**: Verify CRUD operations work
4. **Verify aggregates**: Test summary endpoints
5. **Check imports**: Ensure backward compatibility

## Files to Modify/Create

### New Files (24 files)

- `app/__init__.py`
- `app/main.py`
- `app/config.py`
- `app/database.py`
- `app/models/__init__.py`
- `app/models/base.py`
- `app/models/trip.py`
- `app/models/destination.py`
- `app/models/activity.py`
- `app/models/expense.py`
- `app/models/packing_item.py`
- `app/models/journey.py`
- `app/schemas/__init__.py`
- `app/schemas/trip.py`
- `app/schemas/destination.py`
- `app/schemas/activity.py`
- `app/schemas/expense.py`
- `app/schemas/packing_item.py`
- `app/schemas/journey.py`
- `app/schemas/aggregates.py`
- `app/routers/__init__.py`
- `app/routers/health.py`
- `app/routers/trips.py`
- `app/routers/destinations.py`
- `app/routers/activities.py`
- `app/routers/expenses.py`
- `app/routers/packing.py`
- `app/routers/journeys.py`
- `app/services/__init__.py`
- `app/services/expense_service.py`
- `app/services/packing_service.py`
- `app/services/activity_service.py`
- `app/services/timeline_service.py`

### Modified Files (4 files)

- `main.py` - Simplified entry point
- `models.py` - Backward compatibility redirect
- `schemas.py` - Backward compatibility redirect
- `database.py` - Backward compatibility redirect

### Spec File

Create `BACKEND_SPEC.md` documenting the refactored architecture.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Import path changes break tests | Add backward compatibility re-exports |
| Circular imports between models | Use `TYPE_CHECKING` for type hints |
| Missing endpoint after refactor | Run full test suite after each step |
| Database session issues | Keep existing `get_db()` pattern |

## Success Criteria

- [ ] All 63 tests pass
- [ ] API documentation accessible at /docs
- [ ] Each file has descriptive header comment
- [ ] No circular import errors
- [ ] Backward compatibility maintained
- [ ] BACKEND_SPEC.md created and accurate
