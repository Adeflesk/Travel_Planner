# Travel Planner

A full-stack travel planning application for organizing trips, destinations, journeys, activities, expenses, and packing lists.

## Tech Stack

**Backend:**
- Python FastAPI
- SQLAlchemy ORM with SQLite database
- Pydantic schemas for validation
- JWT authentication

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide icons

## Project Structure

```
Travel_Planner/
├── app/                    # FastAPI backend
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── routers/           # API endpoints
│   └── main.py            # App entry point
├── frontend/              # Next.js frontend
│   ├── app/               # Pages (App Router)
│   ├── components/        # React components (organized by feature)
│   ├── lib/               # Utilities, API client, types
│   └── e2e/               # Playwright tests
├── docs/                  # Documentation
│   └── features/          # Feature specifications
└── travel_planner.db      # SQLite database
```

## Python Virtual Environment

This project uses a Python virtual environment at `.venv/`. Always activate it before running backend commands:

```bash
source .venv/bin/activate  # macOS/Linux
```

Dependencies are listed in `requirements.txt`.

## Running the Project

**Backend:**
```bash
# Activate venv first
source .venv/bin/activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install  # if needed
npm run dev
# Runs on http://localhost:3000
```

## Key Patterns

- **Component Organization:** Features are organized into directories with:
  - `ComponentName.tsx` - UI component
  - `useComponentName.ts` - Custom hook for data/logic
  - `index.ts` - Barrel exports

- **API Client:** All API calls go through `frontend/lib/api.ts`

- **Types:** Shared TypeScript interfaces in `frontend/lib/types.ts`

- **Authentication:** JWT tokens stored in localStorage, managed by `frontend/lib/auth-context.tsx`

## Database

SQLite database at `travel_planner.db`. To add new columns, use ALTER TABLE:
```sql
ALTER TABLE table_name ADD COLUMN column_name TYPE;
```

## Feature Documentation

Planned features are documented in `docs/features/`. Each feature has its own markdown file with requirements, approach, and acceptance criteria.

## Current Feature: Flexible Journey Locations

Journeys can now use either:
- `origin_id`/`destination_id` - Link to existing destinations
- `origin_name`/`destination_name` - Free text for locations like home airports
