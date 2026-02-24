# Travel Planner

A full-stack travel planning application for organizing trips, destinations, journeys, activities, expenses, and packing lists.

## Language & Compatibility

This project uses TypeScript (frontend) and Python (backend). Python 3.13 is the target version. Modern Python syntax is fully supported — use `X | Y` unions, `list[x]`/`dict[k, v]` builtins, `match` statements, etc. freely.

## Backend / Python

This project targets Python 3.13. Modern type hint syntax (PEP 604 `X | Y`, PEP 585 built-in generics like `list[str]`) is encouraged. No need for `typing.Optional` or `typing.Union` workarounds.

After making backend changes, always restart the dev server and verify the change works at runtime. When installing Python dependencies, confirm you're in the correct virtual environment first.

## CI/CD

When fixing CI/CD or linter issues, verify the fix works against the exact CI environment version (Python 3.12 / 3.13) before committing. Check `.github/workflows/` files for runtime versions first.

## Git Workflow

When working on git branches, always confirm the current branch with `git branch` and verify it contains all expected features before creating new branches. Never branch from `master`/`main` when the intent is to build on an existing feature branch.

Before creating or switching git branches, confirm the current branch and ensure new branches are created from the correct base branch (usually the active feature branch, not master/main).

### ⚠️ Git Worktrees — iCloud Drive Rule

This project is in `~/Documents/`, which iCloud Drive syncs. **Never create worktrees inside the repo** (e.g. `.worktrees/`). iCloud generates ` 2`/` 3`/` 4` duplicate files that get accidentally committed.

**Always use:**
```bash
mkdir -p ~/worktrees/Travel_Planner
git worktree add -b feature/<name> ~/worktrees/Travel_Planner/<name> master
```

See `.agent/workflows/create-worktree.md` for the full worktree lifecycle.


## Development Workflow

After making backend schema or model changes, always suggest restarting the dev server. After fixing lint/type errors, run the full lint suite locally before committing.

## Code Quality

When editing string literals in JSX/TSX or template strings, double-check quote escaping and special characters before finalizing the edit.

Always run `npm run lint` and `npx tsc --noEmit` after modifying TypeScript/React files. Fix any errors before considering the task complete.

## Frontend / Styling

When fixing CSS/styling bugs (especially dark mode), inspect the full CSS variable/token chain from root to component. Don't just override at the component level — find the actual source of the incorrect value.

## Deployment

### Production Environment
- **Backend:** Deployed to [Fly.io](https://fly.io) using Docker (Python 3.13, Gunicorn + Uvicorn workers)
- **Frontend:** Deployed to [Vercel](https://vercel.com) (Node 20, Next.js App Router)
- **Database:** SQLite locally, **Neon Postgres** in production (not Fly Postgres)

### Important Constraints
- **Python version:** CI tests against 3.12 and 3.13. Dockerfile uses 3.13. Code must be compatible with both.
- **Node version:** CI and production use Node 20
- **Database migrations:** Any schema changes require database migration consideration
- **Environment variables:** All secrets and config must use environment variables (never hardcode)

### When Making Changes
- **Dockerfile edits:** Use multi-stage build pattern, maintain Python 3.13 base image, keep non-root user
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
