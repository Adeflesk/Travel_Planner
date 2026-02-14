# API Specification: Business Logic Consolidation

## Overview

This document specifies new FastAPI endpoints that consolidate business logic currently implemented in the Next.js frontend. The goal is to:

1. Reduce N+1 API call patterns
2. Centralize computed values and aggregations
3. Simplify frontend hooks to thin data fetchers
4. Enable caching and reuse across clients

---

## 1. Expense Summary Endpoint

### Current Frontend Logic
**File:** `frontend/components/expenses/useExpenses.ts` (lines 56-64)

```typescript
const totalExpenses = expenses.reduce(
  (sum, exp) => sum + parseFloat(exp.amount.toString()), 0
);
const expensesByCategory = expenses.reduce((acc, exp) => {
  acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount.toString());
  return acc;
}, {} as Record<string, number>);
```

### New Endpoint

```
GET /trips/{trip_id}/expenses/summary/
```

### Response Schema

```json
{
  "total": 1250.50,
  "paid_total": 800.00,
  "unpaid_total": 450.50,
  "by_category": {
    "accommodation": 600.00,
    "food": 350.50,
    "transport": 200.00,
    "activities": 100.00
  },
  "count": 12,
  "currency": "USD"
}
```

### Implementation Notes

```python
@app.get("/trips/{trip_id}/expenses/summary/")
def get_expense_summary(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()

    total = sum(float(e.amount) for e in expenses)
    paid_total = sum(float(e.amount) for e in expenses if e.is_paid)

    by_category = {}
    for e in expenses:
        cat = e.category or "other"
        by_category[cat] = by_category.get(cat, 0) + float(e.amount)

    return {
        "total": round(total, 2),
        "paid_total": round(paid_total, 2),
        "unpaid_total": round(total - paid_total, 2),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "count": len(expenses)
    }
```

### Frontend Changes

**Before:** `useExpenses.ts` calculates totals on every render
**After:** Single API call, hook becomes:

```typescript
const { data: summary } = useSWR(`/trips/${tripId}/expenses/summary/`);
```

---

## 2. Trip Progress Endpoint

### Current Frontend Logic
**File:** `frontend/components/trip-activities/useTripActivities.ts` (lines 23-46, 63-75)

Currently makes N+1 API calls:
1. Fetch all destinations for trip
2. For each destination, fetch activities

Then computes:
```typescript
const totalActivities = destinationsWithActivities.reduce(
  (sum, d) => sum + d.activities.length, 0
);
const completedActivities = destinationsWithActivities.reduce(
  (sum, d) => sum + d.activities.filter((a) => a.is_completed).length, 0
);
```

### New Endpoint

```
GET /trips/{trip_id}/progress/
```

### Response Schema

```json
{
  "activities": {
    "total": 15,
    "completed": 8,
    "percent": 53
  },
  "packing": {
    "total": 25,
    "packed": 18,
    "percent": 72
  },
  "expenses": {
    "total_amount": 1250.50,
    "paid_amount": 800.00,
    "paid_percent": 64
  },
  "destinations_count": 4,
  "journeys_count": 3
}
```

### Implementation Notes

```python
@app.get("/trips/{trip_id}/progress/")
def get_trip_progress(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Activities: join through destinations
    destinations = db.query(Destination).filter(Destination.trip_id == trip_id).all()
    dest_ids = [d.id for d in destinations]

    activities = db.query(Activity).filter(Activity.destination_id.in_(dest_ids)).all()
    total_activities = len(activities)
    completed_activities = sum(1 for a in activities if a.is_completed)

    # Packing items
    packing_items = db.query(PackingItem).filter(PackingItem.trip_id == trip_id).all()
    total_packing = len(packing_items)
    packed_items = sum(1 for p in packing_items if p.is_packed)

    # Expenses
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    total_expense = sum(float(e.amount) for e in expenses)
    paid_expense = sum(float(e.amount) for e in expenses if e.is_paid)

    # Journeys
    journeys_count = db.query(Journey).filter(Journey.trip_id == trip_id).count()

    return {
        "activities": {
            "total": total_activities,
            "completed": completed_activities,
            "percent": round(completed_activities / total_activities * 100) if total_activities > 0 else 0
        },
        "packing": {
            "total": total_packing,
            "packed": packed_items,
            "percent": round(packed_items / total_packing * 100) if total_packing > 0 else 0
        },
        "expenses": {
            "total_amount": round(total_expense, 2),
            "paid_amount": round(paid_expense, 2),
            "paid_percent": round(paid_expense / total_expense * 100) if total_expense > 0 else 0
        },
        "destinations_count": len(destinations),
        "journeys_count": journeys_count
    }
```

### Frontend Changes

**Before:** N+1 API calls, complex reduce operations
**After:** Single API call

```typescript
const { data: progress } = useSWR(`/trips/${tripId}/progress/`);
```

---

## 3. Timeline Endpoint

### Current Frontend Logic
**File:** `frontend/components/timeline/useTimeline.ts` (lines 32-75)

Currently:
1. Fetches destinations and journeys in parallel (2 calls)
2. Merges into single array with type discriminator
3. Sorts by date
4. Provides lookup functions for destination names

### New Endpoint

```
GET /trips/{trip_id}/timeline/
```

### Response Schema

```json
{
  "items": [
    {
      "type": "destination",
      "sort_date": "2024-06-15",
      "data": {
        "id": 1,
        "name": "Paris",
        "country": "France",
        "region": "Ile-de-France",
        "arrival_date": "2024-06-15",
        "departure_date": "2024-06-18"
      }
    },
    {
      "type": "journey",
      "sort_date": "2024-06-18T10:00:00",
      "data": {
        "id": 1,
        "transport_mode": "train",
        "origin_name": "Paris",
        "destination_name": "Lyon",
        "departure_datetime": "2024-06-18T10:00:00",
        "arrival_datetime": "2024-06-18T12:00:00",
        "carrier": "SNCF",
        "status": "booked",
        "cost": 89.00
      }
    },
    {
      "type": "destination",
      "sort_date": "2024-06-18",
      "data": {
        "id": 2,
        "name": "Lyon",
        "country": "France",
        "arrival_date": "2024-06-18",
        "departure_date": "2024-06-20"
      }
    }
  ]
}
```

### Implementation Notes

```python
@app.get("/trips/{trip_id}/timeline/")
def get_trip_timeline(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    destinations = db.query(Destination).filter(Destination.trip_id == trip_id).all()
    journeys = db.query(Journey).filter(Journey.trip_id == trip_id).all()

    # Build destination lookup for journey origin/destination names
    dest_lookup = {d.id: d.name for d in destinations}

    items = []

    # Add destinations
    for d in destinations:
        sort_date = d.arrival_date or "0000-00-00"
        items.append({
            "type": "destination",
            "sort_date": str(sort_date),
            "data": {
                "id": d.id,
                "name": d.name,
                "country": d.country,
                "region": d.region,
                "arrival_date": str(d.arrival_date) if d.arrival_date else None,
                "departure_date": str(d.departure_date) if d.departure_date else None
            }
        })

    # Add journeys with resolved names
    for j in journeys:
        sort_date = j.departure_datetime or "0000-00-00"
        items.append({
            "type": "journey",
            "sort_date": str(sort_date),
            "data": {
                "id": j.id,
                "transport_mode": j.transport_mode,
                "origin_name": dest_lookup.get(j.origin_id, "Unknown"),
                "destination_name": dest_lookup.get(j.destination_id, "Unknown"),
                "departure_datetime": str(j.departure_datetime) if j.departure_datetime else None,
                "arrival_datetime": str(j.arrival_datetime) if j.arrival_datetime else None,
                "carrier": j.carrier,
                "status": j.status,
                "cost": float(j.cost) if j.cost else None,
                "booking_reference": j.booking_reference
            }
        })

    # Sort by date
    items.sort(key=lambda x: x["sort_date"])

    return {"items": items}
```

### Frontend Changes

**Before:** 2 API calls + merge + sort + lookups
**After:** Single API call with pre-resolved names

```typescript
const { data: timeline } = useSWR(`/trips/${tripId}/timeline/`);
// No more getDestinationName() lookups needed
```

---

## 4. Destination with Activities Endpoint

### Current Frontend Logic
**File:** `frontend/components/trip-activities/useTripActivities.ts` (lines 23-38)

N+1 query pattern:
```typescript
const results = await Promise.all(
  destinations.map(async (destination) => {
    const actResponse = await activityApi.getByDestinationId(destination.id);
    return { destination, activities: actResponse.data };
  })
);
```

### New Endpoint

```
GET /trips/{trip_id}/destinations-with-activities/
```

### Response Schema

```json
{
  "destinations": [
    {
      "destination": {
        "id": 1,
        "name": "Paris",
        "country": "France"
      },
      "activities": [
        {
          "id": 1,
          "name": "Eiffel Tower Visit",
          "is_completed": true,
          "scheduled_date": "2024-06-16",
          "activity_type": "sightseeing"
        },
        {
          "id": 2,
          "name": "Louvre Museum",
          "is_completed": false,
          "scheduled_date": "2024-06-17",
          "activity_type": "sightseeing"
        }
      ],
      "activity_count": 2,
      "completed_count": 1
    }
  ],
  "total_activities": 5,
  "total_completed": 2,
  "progress_percent": 40
}
```

### Implementation Notes

```python
@app.get("/trips/{trip_id}/destinations-with-activities/")
def get_destinations_with_activities(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    destinations = db.query(Destination).filter(
        Destination.trip_id == trip_id
    ).order_by(Destination.arrival_date).all()

    result = []
    total_activities = 0
    total_completed = 0

    for dest in destinations:
        activities = db.query(Activity).filter(
            Activity.destination_id == dest.id
        ).order_by(Activity.scheduled_date).all()

        completed = sum(1 for a in activities if a.is_completed)
        total_activities += len(activities)
        total_completed += completed

        result.append({
            "destination": {
                "id": dest.id,
                "name": dest.name,
                "country": dest.country,
                "region": dest.region
            },
            "activities": [
                {
                    "id": a.id,
                    "name": a.name,
                    "is_completed": a.is_completed,
                    "scheduled_date": str(a.scheduled_date) if a.scheduled_date else None,
                    "activity_type": a.activity_type,
                    "is_todo": a.is_todo
                }
                for a in activities
            ],
            "activity_count": len(activities),
            "completed_count": completed
        })

    return {
        "destinations": result,
        "total_activities": total_activities,
        "total_completed": total_completed,
        "progress_percent": round(total_completed / total_activities * 100) if total_activities > 0 else 0
    }
```

### Frontend Changes

**Before:** N+1 API calls
**After:** Single API call

```typescript
const { data } = useSWR(`/trips/${tripId}/destinations-with-activities/`);
```

---

## 5. Accommodation Expenses for Destination

### Current Frontend Logic
**File:** `frontend/components/destinations/useDestinations.ts` (lines 41-62)

Complex date-range matching:
```typescript
const getAccommodationExpenses = useCallback((dest: Destination) => {
  return expenses.filter((exp) => {
    if (exp.category !== 'accommodation') return false;
    if (exp.destination_id === dest.id) return true;
    // Auto-link by date range
    if (!exp.destination_id && dest.arrival_date && dest.departure_date) {
      const expDate = new Date(exp.date);
      const arrival = new Date(dest.arrival_date);
      const departure = new Date(dest.departure_date);
      return expDate >= arrival && expDate < departure;
    }
    return false;
  });
}, [expenses]);
```

### New Endpoint

```
GET /destinations/{destination_id}/accommodation-expenses/
```

### Response Schema

```json
{
  "destination_id": 1,
  "destination_name": "Paris",
  "expenses": [
    {
      "id": 5,
      "description": "Hotel Le Marais - 3 nights",
      "amount": 450.00,
      "date": "2024-06-15",
      "is_paid": true,
      "link_type": "manual"
    },
    {
      "id": 8,
      "description": "Airbnb cleaning fee",
      "amount": 35.00,
      "date": "2024-06-16",
      "is_paid": false,
      "link_type": "auto_date"
    }
  ],
  "total": 485.00
}
```

### Implementation Notes

```python
@app.get("/destinations/{destination_id}/accommodation-expenses/")
def get_accommodation_expenses(destination_id: int, db: Session = Depends(get_db)):
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    # Get all accommodation expenses for the trip
    all_accommodation = db.query(Expense).filter(
        Expense.trip_id == dest.trip_id,
        Expense.category == "accommodation"
    ).all()

    expenses = []
    for exp in all_accommodation:
        link_type = None

        # Manual link takes priority
        if exp.destination_id == destination_id:
            link_type = "manual"
        # Auto-link by date range
        elif exp.destination_id is None and dest.arrival_date and dest.departure_date:
            if exp.date and dest.arrival_date <= exp.date < dest.departure_date:
                link_type = "auto_date"

        if link_type:
            expenses.append({
                "id": exp.id,
                "description": exp.description,
                "amount": float(exp.amount),
                "date": str(exp.date) if exp.date else None,
                "is_paid": exp.is_paid,
                "link_type": link_type
            })

    return {
        "destination_id": destination_id,
        "destination_name": dest.name,
        "expenses": expenses,
        "total": round(sum(e["amount"] for e in expenses), 2)
    }
```

---

## 6. Packing Summary Endpoint

### Current Frontend Logic
**File:** `frontend/components/packing/usePacking.ts` (lines 65-85)

```typescript
const packedCount = items.filter((item) => item.is_packed).length;
const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;
const itemsByCategory = items.reduce((acc, item) => {
  const cat = item.category || 'other';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(item);
  return acc;
}, {} as Record<string, PackingItem[]>);
```

### New Endpoint

```
GET /trips/{trip_id}/packing/summary/
```

### Response Schema

```json
{
  "total_items": 25,
  "packed_items": 18,
  "progress_percent": 72,
  "by_category": {
    "clothing": {
      "total": 10,
      "packed": 8,
      "items": [
        {"id": 1, "item_name": "T-shirts (5)", "is_packed": true},
        {"id": 2, "item_name": "Jeans (2)", "is_packed": true}
      ]
    },
    "toiletries": {
      "total": 8,
      "packed": 5,
      "items": [...]
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Quick Wins
1. `/trips/{trip_id}/expenses/summary/`
2. `/trips/{trip_id}/packing/summary/`

### Phase 2: N+1 Query Fixes
3. `/trips/{trip_id}/progress/`
4. `/trips/{trip_id}/destinations-with-activities/`

### Phase 3: Complex Logic Migration
5. `/trips/{trip_id}/timeline/`
6. `/destinations/{destination_id}/accommodation-expenses/`

---

## Testing Strategy

Each new endpoint should have:

1. **Unit tests** in `test_main.py`:
   - Empty data case
   - Single item case
   - Multiple items with various states
   - Non-existent trip/destination (404)

2. **E2E test updates** in `frontend/e2e/`:
   - Verify frontend consumes new endpoints
   - Check computed values match expected

---

## Migration Checklist

For each endpoint:

- [ ] Add Pydantic response schema in `schemas.py`
- [ ] Implement endpoint in `main.py`
- [ ] Add unit tests in `test_main.py`
- [ ] Update frontend hook to use new endpoint
- [ ] Remove old computation logic from hook
- [ ] Update E2E tests if needed
- [ ] Verify all tests pass
