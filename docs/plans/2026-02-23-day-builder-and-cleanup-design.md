# Design: Day Builder, Codebase Cleanup, and Big Picture Architecture

**Date:** 2026-02-23
**Status:** Design approved, not yet implemented
**Related docs:** `docs/plans/2026-02-22-trip-wizard-architecture-design.md`, `docs/plans/2026-02-23-trip-wizard-architecture-plan.md`

---

## Problem

The current application has grown through several iterations without a clean end-to-end flow for the simplest trip type: a city break. Before building the large trip wizard refactor, we need to:

1. Clean up iCloud artifact files and stale docs accumulated during development
2. Establish a Day Builder as the foundational building block for city trips
3. Add a Dashboard and user Settings surface
4. Clarify the database query strategy (views vs stored procedures)
5. Resolve mobile and project management tooling decisions

---

## Build Phases

Everything that follows is organised into four sequential phases:

| Phase | Focus | Depends on |
|---|---|---|
| **A** | Codebase cleanup + commit uncommitted work | Nothing |
| **B** | Day Builder + city break slice (end-to-end) | Phase A |
| **C** | Road trip builder refactor above Day Builder | Phase B validated |
| **D** | International, multi-city, return flights, PWA | Phase C |

The trip wizard architecture plan (`2026-02-23-trip-wizard-architecture-plan.md`) covers Phase C and D. This document covers Phase A and B.

---

## Section 1: Codebase Cleanup (Phase A)

### 1a. Commit uncommitted work first

Four files have modifications that haven't been committed:

| File | Action |
|---|---|
| `frontend/components/journey-segments/SegmentWizard.tsx` | Commit with current changes |
| `frontend/components/journey-segments/RoadTripBuilder.tsx` | Commit with current changes |
| `frontend/components/ui/Input.tsx` | Commit with current changes |
| `frontend/lib/segment-templates.ts` | Commit with current changes |
| `frontend/e2e/journey-segments.spec.ts` (deleted) | Commit the deletion |

Commit message: `chore: commit in-progress segment wizard and road trip builder changes`

### 1b. Mechanical deletions (zero risk)

All files with ` 2`, ` 3`, ` 4` suffixes are iCloud Drive sync artifacts. Delete all of them:

**`frontend/components/journey-segments/`**
- `SegmentBuilder 2.tsx`
- `SegmentBuilder 3.tsx`
- `SegmentManager 2.tsx`
- `SegmentOptionsManager 2.tsx`
- `useSegmentBuilder 2.ts`
- `useSegmentBuilder 3.ts`
- `index 2.ts`

**`frontend/components/ui/`**
- `AirportAutocomplete 3.tsx`

**`frontend/e2e/`**
- `journey-segments.spec 2.ts` (iCloud duplicate; the real file was deliberately deleted)
- `journey-segments.spec.ts.orig`
- `journeys.spec.ts.orig`
- `timeline.spec.ts.orig`

**`frontend/`**
- `run-test.ts` (stub — only contains a bare import, never completed)

**Root level**
- `CLAUDE 2.md`
- `Dockerfile 2`
- `README 4.md`
- `requirements 2.txt`
- `Plans.txt`
- `.aider.chat.history.md`
- `.aider.input.history`

**`.gitignore` additions**
```
# iCloud Drive artifacts
* 2
* 3
* 4
*.orig

# Unused venvs
.venv312/

# Aider
.aider*
```

Delete `.venv312/` directory (active venv remains at `.venv/`).

### 1c. Docs pruning

| File | Action | Reason |
|---|---|---|
| `docs/plans/gcs-free-tier-migration.md` | Delete | Old GCS cloud storage research, superseded |
| `docs/plans/gcs-migration-spec.md` | Delete | Old GCS cloud storage research, superseded |
| `docs/plans/brainstorming.txt` | Delete | Informal notes, now captured in design docs |
| `docs/plans/2026-02-22-leg-segment-type-design.md` | Delete | Content absorbed into trip wizard design |
| `docs/plans/2026-02-22-leg-segment-type-plan.md` | Delete | Content absorbed into trip wizard plan |

**Keep:**
- `docs/plans/expense-architecture-review.md` — referenced by trip wizard design
- `docs/plans/nextauth-fastapi-neon-integration.md` — future reference for auth migration
- All `road-trip-builder-*` and `trip-wizard-*` docs — active plans

---

## Section 2: Day Builder Data Model

Two new tables, fully additive. No changes to existing tables.

```sql
CREATE TABLE trip_days (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id     INTEGER  NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    date        DATE     NOT NULL,
    title       TEXT,                   -- e.g. "Day 1 — Covent Garden"
    location    TEXT,                   -- city / area name, free text
    notes       TEXT,
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    UNIQUE(trip_id, date)
);

CREATE TABLE day_activities (
    id           INTEGER  PRIMARY KEY AUTOINCREMENT,
    day_id       INTEGER  NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    start_time   TEXT     NOT NULL,     -- ISO time string "HH:MM"
    end_time     TEXT,                  -- optional; open-ended activities omit this
    title        TEXT     NOT NULL,
    category     TEXT,                  -- museum | restaurant | bar | activity |
                                        -- transport | accommodation | other
    location     TEXT,                  -- more specific than trip_days.location
    notes        TEXT,
    cost         REAL,                  -- quick planning estimate, not an Expense record
    currency     TEXT,                  -- defaults to trip.context.budget_currency
    booked       INTEGER  NOT NULL DEFAULT 0,   -- boolean (0/1 in SQLite)
    sort_order   INTEGER  NOT NULL DEFAULT 0
);
```

**Journeys connect via an optional FK on the journeys table:**

```sql
ALTER TABLE journeys ADD COLUMN day_id INTEGER REFERENCES trip_days(id);
```

This is nullable. Existing journeys are unaffected (`day_id = NULL`). When a Journey is linked to a Day (e.g. a travel day), it appears as a read-only "Travel" block at the top of that day's timeline in the UI.

**Cost note:** `day_activities.cost` follows the same pattern as `journey_segment.metadata.cost` — a planning estimate, not a tracked expense. Cost→expense promotion (banner pattern already designed in the trip wizard architecture) is Phase C.

### SQLAlchemy models

```python
# app/models/trip_day.py
from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, UniqueConstraint
from database import Base

class TripDay(Base):
    __tablename__ = "trip_days"

    id         = Column(Integer, primary_key=True)
    trip_id    = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    date       = Column(Date, nullable=False)
    title      = Column(Text)
    location   = Column(Text)
    notes      = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("trip_id", "date", name="uq_trip_day"),)


# app/models/day_activity.py
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from database import Base

class DayActivity(Base):
    __tablename__ = "day_activities"

    id         = Column(Integer, primary_key=True)
    day_id     = Column(Integer, ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(String(5), nullable=False)   # "HH:MM"
    end_time   = Column(String(5))
    title      = Column(Text, nullable=False)
    category   = Column(String(32))
    location   = Column(Text)
    notes      = Column(Text)
    cost       = Column(Float)
    currency   = Column(String(3))
    booked     = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
```

---

## Section 3: Day Builder UI

### 3a. Component tree

```
frontend/components/days/
  DayList.tsx           — list of TripDay cards on the trip detail page
  DayBuilder.tsx        — full-page vertical timeline for one day
  ActivityForm.tsx      — slide-up form for add / edit activity
  ActivityBlock.tsx     — single activity block rendered on the timeline
  index.ts              — barrel exports
```

### 3b. Timeline layout

A vertical time grid from 7am to midnight, 1-hour row height. Activities are positioned absolutely based on `start_time`. Each block shows: title, category icon, duration (`end_time - start_time` if both set).

```
┌─────────────────────────────────────┐
│  Monday 24 Feb · London             │
│  [+ Add activity]                   │
├──────┬──────────────────────────────┤
│ 9am  │                              │
│ 10am │ ██ National Gallery     [⋮]  │
│      │    Museum · 2h               │
│ 11am │                              │
│ 12pm │                              │
│ 1pm  │ ██ Dishoom              [⋮]  │
│      │    Restaurant · 1.5h         │
│ 2pm  │                              │
│ 3pm  │ ██ Covent Garden        [⋮]  │
│      │    Activity · 1h             │
│ ...  │                              │
└──────┴──────────────────────────────┘
[Unscheduled]
  • Borough Market (no time set)
```

### 3c. Interaction model

- Tap a time slot → opens `ActivityForm` with `start_time` pre-filled
- Tap "+ Add activity" → opens `ActivityForm` with no pre-fill
- Tap an activity block → opens `ActivityForm` in edit mode
- `⋮` menu → Delete
- Activities sorted by `start_time`; no drag-and-drop in Phase B (YAGNI)
- Activities without a `start_time` appear in an "Unscheduled" section below the grid

### 3d. ActivityForm fields

| Field | Type | Required |
|---|---|---|
| Title | text | Yes |
| Category | select (museum/restaurant/bar/activity/transport/accommodation/other) | No |
| Start time | time | Yes |
| End time | time | No |
| Location | text | No |
| Notes | textarea | No |
| Cost | number | No |
| Booked? | checkbox | No |

### 3e. Trip page integration

The trip detail page (`app/trips/[id]/page.tsx`) gets a tab bar: **Days** | **Journeys** | **Expenses** | **Packing**.

- `DayList.tsx` renders under the Days tab — one card per `TripDay` (date, title, activity count, location)
- Clicking a DayList card navigates to `/trips/[id]/days/[dayId]` (the full DayBuilder view)
- "Add day" button → opens a small form: date + optional title + location

**City break mode:** When `trip.context.trip_type === 'single_city'`, the Days tab is the default (first tab). The Journeys tab moves to second position. The "Add journey" CTA inside the Journeys tab shows a note: "Journeys are for travel between places. For activities within your destination, use the Days tab."

### 3f. Mobile-first constraint

Every Day Builder component must be designed for 375px width first. The timeline grid is a single-column layout — no side-by-side panels. The `ActivityForm` is a bottom sheet (slides up from the bottom) on mobile, a modal on desktop.

---

## Section 4: Dashboard & Settings

### 4a. User Settings page

Route: `/settings`

Stored in a `user_settings` table (one row per user):

```sql
CREATE TABLE user_settings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_currency TEXT    NOT NULL DEFAULT 'USD',
    home_base        TEXT,
    feature_flags    TEXT    NOT NULL DEFAULT '{}'   -- JSON
);
```

`feature_flags` JSON structure:
```json
{
  "road_trip_builder": true,
  "expense_tracking": true,
  "packing_list": true
}
```

Settings page sections:
1. **Defaults** — default currency (select), home base (free text)
2. **Features** — toggle switches for each flag. Disabling a feature hides it from all trips (tabs, wizard steps, etc.). Data is never deleted.
3. *(Future: theme toggle, notification preferences)*

API: `GET /settings` → returns the user's settings row. `PATCH /settings` → partial update.
Frontend hook: `useUserSettings()` — fetched once on app mount, cached in context.

### 4b. Dashboard

Route: `/` (replaces the current plain trip list)

Panels:
1. **Next trip** — the upcoming trip with the nearest `start_date`. Shows days-until countdown, destination, budget remaining.
2. **All trips** — the full trip list, sorted by `start_date` DESC. Uses a `trip_summary` database view (see Section 5) to avoid N+1 queries.
3. **Quick create** — a prominent "+ New trip" button that opens the 5-step wizard.

No "recent activity" feed in Phase B (YAGNI — add if users request it).

---

## Section 5: Database Views

### 5a. `trip_summary` view

Used by the Dashboard trip list to avoid N+1 queries:

```sql
CREATE VIEW trip_summary AS
SELECT
    t.id,
    t.name,
    t.start_date,
    t.end_date,
    t.budget,
    COUNT(DISTINCT j.id)              AS journey_count,
    COUNT(DISTINCT td.id)             AS day_count,
    COALESCE(SUM(e.amount), 0)        AS total_spent,
    t.budget - COALESCE(SUM(e.amount), 0) AS budget_remaining
FROM trips t
LEFT JOIN journeys j    ON j.trip_id = t.id
LEFT JOIN trip_days td  ON td.trip_id = t.id
LEFT JOIN expenses e    ON e.trip_id = t.id
GROUP BY t.id;
```

SQLAlchemy maps a read-only `TripSummary` model to this view. The `GET /trips` list endpoint uses it instead of loading full trip objects.

Both SQLite (local dev) and Postgres (production) support `CREATE VIEW` — no compatibility issue.

### 5b. Future candidate views

| View | Purpose |
|---|---|
| `expense_by_category` | Expense breakdown for the trip expense chart |
| `day_activity_summary` | Activity count + total cost per day for DayList cards |

### 5c. Stored procedures — not used

SQLite does not support stored procedures. All business logic belongs in Python (FastAPI services). Stored procedures would split logic between Python and SQL, make unit testing harder, and break local development entirely. This decision stands for the lifetime of the project unless the backend moves to a pure Postgres setup with a Python-free hot path (not planned).

---

## Section 6: Mobile Strategy + Project Management

### 6a. Mobile — responsive Next.js, no framework change

Next.js 14 + Tailwind CSS is capable of an excellent mobile experience. The current components lack mobile layouts — that's a missing constraint, not a framework limitation.

**Rules for Phase B and beyond:**
- Every new component is designed at 375px first, then expanded for desktop
- Bottom sheets (slide-up from bottom) replace modals on mobile for forms
- The road trip builder's side-by-side panel layout gets a stacked/tabbed layout on small screens — this happens in Phase C during the refactor
- No framework change is needed

**PWA (Phase D):** Vercel + Next.js supports `next-pwa` with minimal config. Adds installability and basic offline support. Deferred until Phase D.

### 6b. Project management — GitHub Issues, not Jira

Jira is built for multi-person teams. For this project:

- Design decisions → `docs/plans/` (what we're doing now)
- Implementation tasks → `docs/plans/*-plan.md` (per-feature task lists)
- Bug tracking / progress → **GitHub Issues** with one issue per Phase (A, B, C, D), task checklist inside

No extra tooling needed. If the project grows to 3+ contributors, revisit Linear or Jira at that point.

---

## Section 7: New Files Summary

### Phase A — no new files; deletions only

### Phase B — new files

| File | Purpose |
|---|---|
| `migrations/add_trip_days.py` | Creates `trip_days` and `day_activities` tables; adds `day_id` FK to `journeys` |
| `migrations/add_user_settings.py` | Creates `user_settings` table |
| `migrations/add_trip_summary_view.py` | Creates `trip_summary` DB view |
| `app/models/trip_day.py` | `TripDay` SQLAlchemy model |
| `app/models/day_activity.py` | `DayActivity` SQLAlchemy model |
| `app/models/user_settings.py` | `UserSettings` SQLAlchemy model |
| `app/routers/trip_days.py` | CRUD for trip days + activities |
| `app/routers/settings.py` | `GET /settings`, `PATCH /settings` |
| `frontend/components/days/DayBuilder.tsx` | Vertical timeline view |
| `frontend/components/days/ActivityForm.tsx` | Bottom sheet / modal for add/edit |
| `frontend/components/days/ActivityBlock.tsx` | Single activity block on timeline |
| `frontend/components/days/DayList.tsx` | List of day cards on trip detail page |
| `frontend/components/days/index.ts` | Barrel exports |
| `frontend/app/trips/[id]/days/[dayId]/page.tsx` | Day Builder page route |
| `frontend/lib/useUserSettings.ts` | Hook for fetching/updating settings |

### Phase B — modified files

| File | Change |
|---|---|
| `app/models/__init__.py` | Register TripDay, DayActivity, UserSettings |
| `app/main.py` | Register trip_days and settings routers |
| `frontend/app/trips/[id]/page.tsx` | Add Days tab; default to Days tab for `single_city` trips |
| `frontend/lib/types.ts` | Add `TripDay`, `DayActivity`, `UserSettings` interfaces |

---

## Verification

### Phase A
- `git status` shows no untracked iCloud artifacts
- `git log --oneline -5` shows the uncommitted changes committed
- `npm run lint && npx tsc --noEmit` — zero errors after cleanup

### Phase B
- Create a single-city trip via the wizard → Days tab is default
- Add a day → DayList shows it with correct date
- Add activities → timeline renders at correct times
- Edit/delete an activity → works without page reload
- Link a Journey to a Day → Journey block appears at top of timeline (read-only)
- Settings page → toggle a feature flag → that feature disappears from all trip pages
- Dashboard → shows active trips with journey_count and day_count from the view
- Mobile (375px) → ActivityForm opens as bottom sheet; timeline scrolls vertically
