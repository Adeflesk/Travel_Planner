# Travel Planner

A full-stack travel planning application for organizing trips, destinations, journeys, activities, expenses, and packing lists.

## Language & Compatibility

This project uses TypeScript (frontend) and Python (backend). Always check Python version compatibility (project targets 3.11+). Use `from __future__ import annotations` or `typing` module aliases instead of PEP 604/PEP 585 syntax for Python type hints.

## CI/CD

When fixing CI/CD or linter issues, verify the fix works against the exact CI environment version (e.g., Python 3.11 vs 3.12) before committing. Check `.github/workflows/` files for runtime versions first.

## Git Workflow

When working on git branches, always confirm the current branch with `git branch` and verify it contains all expected features before creating new branches. Never branch from `master`/`main` when the intent is to build on an existing feature branch.

## Development Workflow

After making backend schema or model changes, always suggest restarting the dev server. After fixing lint/type errors, run the full lint suite locally before committing.

## Code Quality

When editing string literals in JSX/TSX or template strings, double-check quote escaping and special characters before finalizing the edit.

## Deployment

### Production Environment
- **Backend:** Deployed to [Fly.io](https://fly.io) using Docker (Python 3.12, Gunicorn + Uvicorn workers)
- **Frontend:** Deployed to [Vercel](https://vercel.com) (Node 20, Next.js App Router)
- **Database:** SQLite locally, **Neon Postgres** in production (not Fly Postgres)

### Important Constraints
- **Python version:** CI tests against 3.11 and 3.12. Dockerfile uses 3.12. Code must be compatible with both.
- **Node version:** CI and production use Node 20
- **Database migrations:** Any schema changes require database migration consideration
- **Environment variables:** All secrets and config must use environment variables (never hardcode)

### When Making Changes
- **Dockerfile edits:** Use multi-stage build pattern, maintain Python 3.12 base image, keep non-root user
- **Dependencies:** Changes to `requirements.txt` or `package.json` affect build time and deployment
- **Environment variables:** Document new env vars in `docs/deployment.md` Environment Variables Reference section
- **Database changes:** SQLite (local dev) behaves differently from Postgres (production) - test compatibility

### Deployment Documentation
Full deployment guide with step-by-step instructions: [`docs/deployment.md`](docs/deployment.md)

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
│   ├── services/          # Business logic layer
│   ├── core/              # Security, deps, rate limiting, migrations
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

SQLite database at `travel_planner.db`. To add schema changes:
1. Create a Python migration script in `migrations/` following existing patterns
2. Run `python migrate.py` to apply all pending migrations
3. Test SQLite (local) and Postgres (production) compatibility before committing

## Testing & Linting

**Backend tests:**
```bash
source .venv/bin/activate
pytest -q --cov=app tests/
```

**Backend lint:**
```bash
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics
```

**Frontend lint + type check:**
```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**E2E tests** (requires both servers running on ports 8000 and 3000):
```bash
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run test:e2e
```

## Feature Documentation

Feature specs are documented in `docs/features/`. Each file has requirements, approach, and acceptance criteria.
