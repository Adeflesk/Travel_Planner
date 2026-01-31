# Repository Pattern Refactoring Spec

## Overview

This document outlines the plan for implementing the Repository Pattern in the Travel Planner backend. This refactoring is optional and should be considered when the codebase grows or when better testability is needed.

## Current Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Routers   │────▶│  Services   │────▶│  Database   │
│ (endpoints) │     │ (business)  │     │ (SQLAlchemy)│
└─────────────┘     └─────────────┘     └─────────────┘
```

**Current Issues:**
- Database queries are scattered across routers and services
- Hard to unit test without a real database
- No single source of truth for data access patterns
- Inconsistent error handling (some return `None`, some raise exceptions)

## Proposed Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Routers   │────▶│  Services   │────▶│ Repositories │────▶│  Database   │
│ (endpoints) │     │ (business)  │     │ (data access)│     │ (SQLAlchemy)│
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

## Implementation Plan

### Phase 1: Create Base Repository

```python
# app/repositories/base.py
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: int) -> bool:
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
```

### Phase 2: Create Domain Repositories

```python
# app/repositories/trip.py
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, selectinload

from app.models import Trip, TripShare, User
from app.repositories.base import BaseRepository


class TripRepository(BaseRepository[Trip]):
    """Repository for Trip-related database operations."""

    def __init__(self, db: Session):
        super().__init__(Trip, db)

    def get_by_user(self, user_id: int) -> List[Trip]:
        """Get all trips owned by a user."""
        return self.db.query(Trip).filter(Trip.user_id == user_id).all()

    def get_with_owner_email(self, trip_id: int) -> Optional[Tuple[Trip, str]]:
        """Get trip with owner's email in single query."""
        result = (
            self.db.query(Trip, User.email)
            .join(User, Trip.user_id == User.id)
            .filter(Trip.id == trip_id)
            .first()
        )
        return result

    def get_shared_with_user(self, user_id: int) -> List[Tuple[Trip, str]]:
        """Get trips shared with a user, including owner email."""
        return (
            self.db.query(Trip, User.email)
            .join(TripShare, Trip.id == TripShare.trip_id)
            .join(User, Trip.user_id == User.id)
            .filter(TripShare.user_id == user_id)
            .all()
        )

    def user_has_access(self, trip_id: int, user_id: int) -> bool:
        """Check if user owns or has shared access to trip."""
        trip = self.get(trip_id)
        if not trip:
            return False
        if trip.user_id == user_id:
            return True
        share = (
            self.db.query(TripShare)
            .filter(TripShare.trip_id == trip_id, TripShare.user_id == user_id)
            .first()
        )
        return share is not None
```

```python
# app/repositories/user.py
from typing import Optional
from sqlalchemy.orm import Session

from app.models import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User-related database operations."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        return self.db.query(User).filter(User.email == email).first()

    def email_exists(self, email: str) -> bool:
        """Check if email is already registered."""
        return self.get_by_email(email) is not None

    def get_active_users(self) -> List[User]:
        """Get all active users."""
        return self.db.query(User).filter(User.is_active.is_(True)).all()
```

```python
# app/repositories/destination.py
from typing import List
from sqlalchemy.orm import Session, selectinload

from app.models import Destination
from app.repositories.base import BaseRepository


class DestinationRepository(BaseRepository[Destination]):
    """Repository for Destination-related database operations."""

    def __init__(self, db: Session):
        super().__init__(Destination, db)

    def get_by_trip(self, trip_id: int) -> List[Destination]:
        """Get all destinations for a trip, ordered."""
        return (
            self.db.query(Destination)
            .filter(Destination.trip_id == trip_id)
            .order_by(Destination.order)
            .all()
        )

    def get_with_activities(self, trip_id: int) -> List[Destination]:
        """Get destinations with eagerly loaded activities."""
        return (
            self.db.query(Destination)
            .options(selectinload(Destination.activities))
            .filter(Destination.trip_id == trip_id)
            .order_by(Destination.order)
            .all()
        )
```

### Phase 3: Create Repository Factory

```python
# app/repositories/__init__.py
from sqlalchemy.orm import Session

from app.repositories.trip import TripRepository
from app.repositories.user import UserRepository
from app.repositories.destination import DestinationRepository


class RepositoryFactory:
    """Factory for creating repository instances."""

    def __init__(self, db: Session):
        self.db = db

    @property
    def trips(self) -> TripRepository:
        return TripRepository(self.db)

    @property
    def users(self) -> UserRepository:
        return UserRepository(self.db)

    @property
    def destinations(self) -> DestinationRepository:
        return DestinationRepository(self.db)


# Dependency for FastAPI
def get_repos(db: Session = Depends(get_db)) -> RepositoryFactory:
    return RepositoryFactory(db)
```

### Phase 4: Update Routers

```python
# Before (current)
@router.get("/trips/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db), ...):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    ...

# After (with repository)
@router.get("/trips/{trip_id}")
def get_trip(trip_id: int, repos: RepositoryFactory = Depends(get_repos), ...):
    result = repos.trips.get_with_owner_email(trip_id)
    ...
```

### Phase 5: Update Services

```python
# Before (current)
def get_destinations_with_activities(trip_id: int, db: Session):
    destinations = db.query(Destination).filter(...).all()
    for dest in destinations:
        activities = db.query(Activity).filter(...).all()  # N+1!
    ...

# After (with repository)
def get_destinations_with_activities(trip_id: int, repos: RepositoryFactory):
    destinations = repos.destinations.get_with_activities(trip_id)
    # Activities already loaded via selectinload
    ...
```

## Files to Create

```
app/repositories/
├── __init__.py          # RepositoryFactory, exports
├── base.py              # BaseRepository generic class
├── trip.py              # TripRepository
├── user.py              # UserRepository
├── destination.py       # DestinationRepository
├── activity.py          # ActivityRepository
├── expense.py           # ExpenseRepository
├── packing_item.py      # PackingItemRepository
├── journey.py           # JourneyRepository
└── trip_share.py        # TripShareRepository
```

## Files to Modify

| File | Changes |
|------|---------|
| `app/routers/trips.py` | Use `repos.trips` instead of direct queries |
| `app/routers/auth.py` | Use `repos.users` instead of direct queries |
| `app/routers/admin.py` | Use `repos.users` instead of direct queries |
| `app/routers/destinations.py` | Use `repos.destinations` |
| `app/routers/activities.py` | Use `repos.activities` |
| `app/routers/expenses.py` | Use `repos.expenses` |
| `app/routers/packing.py` | Use `repos.packing_items` |
| `app/routers/journeys.py` | Use `repos.journeys` |
| `app/services/*.py` | Accept `RepositoryFactory` instead of `Session` |

## Testing Benefits

```python
# tests/mocks/repositories.py
class MockTripRepository:
    def __init__(self):
        self.trips = {}

    def get(self, id: int):
        return self.trips.get(id)

    def create(self, obj_in: dict):
        trip = Trip(**obj_in, id=len(self.trips) + 1)
        self.trips[trip.id] = trip
        return trip


# tests/test_services.py
def test_trip_progress():
    mock_repos = MockRepositoryFactory()
    mock_repos.trips.trips[1] = Trip(id=1, name="Test")
    mock_repos.activities.activities = [...]

    result = get_trip_progress(1, mock_repos)

    assert result["total_activities"] == 5
```

## When to Implement

Consider implementing when:
- [ ] Codebase grows beyond 20+ endpoints
- [ ] Need comprehensive unit testing without database
- [ ] Planning to support multiple databases
- [ ] Multiple developers working on data access layer
- [ ] Complex queries being duplicated across routers

## Estimated Effort

| Task | Effort |
|------|--------|
| Create base repository | 1 hour |
| Create domain repositories | 4 hours |
| Update routers | 3 hours |
| Update services | 2 hours |
| Update tests | 3 hours |
| **Total** | **~13 hours** |

## References

- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [FastAPI SQLAlchemy Best Practices](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [Python Generics](https://docs.python.org/3/library/typing.html#generics)
