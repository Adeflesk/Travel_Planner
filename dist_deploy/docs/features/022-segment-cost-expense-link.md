# 022: Segment Cost → Expense Link (Option A)

## Context

Journey segments (FLIGHT, BUS, RAIL, TRANSFER, etc.) represent transport legs. Each leg has
a real cost — a flight ticket, a train pass, a taxi fare. Currently those costs live as loose
numbers inside `segment.metadata` and never appear in the trip's expense ledger or budget
reports.

Feature 021 (`journey_segment.py`) already has `stop_options` linked to segments.
Feature 021 (`expense.py`) already specifies adding `segment_id` and `stop_option_id` FKs to
Expense. This document scopes **just the segment cost → expense** part of that plan.

---

## Goal

When a user enters a cost on a journey segment, a proper `Expense` record is automatically
created and linked to that segment via `segment_id`. The expense:

- Shows up in the trip's budget reports and totals
- Can be marked booked/paid independently
- Is deleted if the segment is deleted (cascade)
- Uses the segment's departure date as the expense date
- Uses `category = "transport"`

---

## Decision

**Option A — Direct `segment_id` FK on Expense.**

The Expense model gets a nullable `segment_id` FK referencing `journey_segments.id`.
A segment's cost is captured as a `cost` + `currency` field in `segment.metadata`.
On create/update of a segment with a non-zero cost, the API auto-creates (or upserts) one
Expense record linked by `segment_id`.

---

## Part 1: Database Migration

### File: `migrations/add_segment_id_to_expenses.py`

```python
ALTER TABLE expenses
  ADD COLUMN segment_id INTEGER REFERENCES journey_segments(id) ON DELETE CASCADE;

CREATE INDEX ix_expenses_segment_id ON expenses(segment_id);
```

---

## Part 2: Backend — Model

### File: `app/models/expense.py`

Add to `Expense`:

```python
segment_id = Column(Integer, ForeignKey("journey_segments.id", ondelete="CASCADE"), nullable=True)

# In relationships:
segment = relationship("JourneySegment", back_populates="expenses")
```

### File: `app/models/journey_segment.py`

Add to `JourneySegment`:

```python
expenses = relationship("Expense", back_populates="segment", cascade="all, delete-orphan")
```

---

## Part 3: Backend — Schemas

### File: `app/schemas/expense.py`

Add `segment_id` to `ExpenseCreate`, `ExpenseUpdate`, and `Expense`:

```python
class ExpenseCreate(ExpenseBase):
    trip_id: int
    destination_id: Optional[int] = None
    activity_id: Optional[int] = None
    segment_option_id: Optional[int] = None
    stop_option_id: Optional[int] = None
    segment_id: Optional[int] = None        # ← new

class ExpenseUpdate(BaseModel):
    ...
    segment_id: Optional[int] = None        # ← new

class Expense(ExpenseBase):
    ...
    segment_id: Optional[int] = None        # ← new
```

---

## Part 4: Backend — Service

### New helper: `app/services/expense_service.py`

Add (or extend) a function:

```python
def upsert_segment_expense(
    segment_id: int,
    trip_id: int,
    amount: Decimal,
    currency: str,
    description: str,
    date: date,
    db: Session
) -> Expense:
    """
    Creates or updates the single Expense record linked to this segment.
    One segment → at most one auto-expense (keyed by segment_id).
    Manual expenses added later by the user are separate records.
    """
    existing = db.query(Expense).filter(Expense.segment_id == segment_id).first()
    if existing:
        existing.amount = amount
        existing.currency = currency
        existing.description = description
        existing.date = date
        db.commit()
        db.refresh(existing)
        return existing

    expense = Expense(
        trip_id=trip_id,
        segment_id=segment_id,
        category="transport",
        amount=amount,
        currency=currency,
        description=description,
        date=date,
        booked=False,
        paid=False,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def delete_segment_expense(segment_id: int, db: Session) -> None:
    """Remove the auto-expense for this segment (e.g. when cost is cleared)."""
    db.query(Expense).filter(Expense.segment_id == segment_id).delete()
    db.commit()
```

---

## Part 5: Backend — Segment Router/Service

### File: `app/services/journey_segment_service.py`

In `create_journey_segment` and `update_journey_segment`:

```python
# After persisting the segment, check for cost in metadata
metadata = segment_data.metadata or {}
cost = metadata.get("cost")
currency = metadata.get("currency", "USD")

if cost and Decimal(str(cost)) > 0:
    # Use segment's start_datetime date, fall back to today
    expense_date = (
        segment.start_datetime.date()
        if segment.start_datetime
        else date.today()
    )
    description = f"{segment.segment_type.title()} — {segment.origin_name or ''} → {segment.destination_name or ''}"
    upsert_segment_expense(
        segment_id=segment.id,
        trip_id=journey.trip_id,
        amount=Decimal(str(cost)),
        currency=currency,
        description=description,
        date=expense_date,
        db=db,
    )
elif cost is not None and Decimal(str(cost)) == 0:
    # User explicitly cleared the cost — remove the auto-expense
    delete_segment_expense(segment.id, db)
```

---

## Part 6: Frontend — SegmentCard Cost Fields

### File: `frontend/components/journey-segments/SegmentCard.tsx`

In the **expanded details** section (already shows Start/End time, Timezones), add:

```tsx
{/* Cost fields — shown for all transport segment types */}
{segment.segment_type !== 'STOP' && (
  <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <Input
      label="Cost"
      type="number"
      step="0.01"
      placeholder="0.00"
      value={String(segment.metadata?.cost ?? '')}
      onChange={(e) =>
        onUpdateField(index, 'metadata', {
          ...(segment.metadata ?? {}),
          cost: e.target.value,
        })
      }
    />
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">Currency</label>
      <select
        value={String(segment.metadata?.currency ?? 'USD')}
        onChange={(e) =>
          onUpdateField(index, 'metadata', {
            ...(segment.metadata ?? {}),
            currency: e.target.value,
          })
        }
        className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md px-3 py-2.5"
      >
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="CAD">CAD</option>
        <option value="AUD">AUD</option>
        <option value="JPY">JPY</option>
      </select>
    </div>
    <div className="col-span-2 flex gap-4 text-sm">
      <label className="flex items-center gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(segment.metadata?.booked)}
          onChange={(e) =>
            onUpdateField(index, 'metadata', {
              ...(segment.metadata ?? {}),
              booked: e.target.checked,
            })
          }
          className="rounded border-gray-300 text-blue-600"
        />
        Booked
      </label>
      <label className="flex items-center gap-2 text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(segment.metadata?.paid)}
          onChange={(e) =>
            onUpdateField(index, 'metadata', {
              ...(segment.metadata ?? {}),
              paid: e.target.checked,
            })
          }
          className="rounded border-gray-300 text-blue-600"
        />
        Paid
      </label>
    </div>
  </div>
)}
```

---

## Part 7: Frontend — API Layer

### File: `frontend/lib/api.ts`

In `journeyApi.create` Phase 2 segment creation, and in `journeySegmentApi.update`,
pass `cost`, `currency`, `booked`, `paid` from `metadata` as top-level fields in
the segment payload so the backend service can pick them up:

> **Note:** These fields stay in `metadata` on the frontend (that's where `SegmentCard`
> reads/writes them). The backend service extracts them via `segment_data.metadata.get("cost")`.
> No extra frontend API call needed — the cost is embedded in `metadata` and the backend
> handles expense creation transparently.

---

## Part 8: Frontend — Segment Display

### File: `frontend/components/journey-segments/SegmentManager.tsx`

In the segment list item, display cost if set:

```tsx
{segment.metadata?.cost && (
  <div className="text-xs text-slate-500 mt-0.5">
    {Number(segment.metadata.cost).toFixed(2)} {String(segment.metadata.currency ?? 'USD')}
    {segment.metadata.booked && (
      <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Booked</span>
    )}
  </div>
)}
```

---

## Implementation Order

1. **Migration** — `add_segment_id_to_expenses.py`
2. **Backend model** — `expense.py` + `journey_segment.py`
3. **Backend schema** — `expense.py`
4. **Backend service** — `expense_service.py` upsert helper
5. **Backend segment service** — call upsert in create/update
6. **Frontend SegmentCard** — cost/currency/booked/paid fields
7. **Frontend SegmentManager** — display cost on segment list
8. **Frontend api.ts** — confirm metadata passes through (no change needed)

---

## Verification

1. Create a journey with FLIGHT segment, set cost = 450, currency = EUR, booked = true
2. Save the journey
3. Navigate to Trip → Expenses — confirm "transport" expense for €450 appears
4. Edit the segment, change cost to 500 — expense updates to €500
5. Clear cost to 0 — expense is removed
6. Delete the segment — expense is cascade-deleted
7. Confirm budget totals include the transport expense
8. Run existing expense tests + new segment expense tests

---

## Files to Create

- `migrations/add_segment_id_to_expenses.py`

## Files to Modify

**Backend:**
- `app/models/expense.py`
- `app/models/journey_segment.py`
- `app/schemas/expense.py`
- `app/services/expense_service.py`
- `app/services/journey_segment_service.py`

**Frontend:**
- `frontend/components/journey-segments/SegmentCard.tsx`
- `frontend/components/journey-segments/SegmentManager.tsx`
