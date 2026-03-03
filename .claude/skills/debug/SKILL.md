---
name: debug
description: Use when encountering any bug, test failure, CI error, or unexpected behaviour. Enforces root-cause analysis before attempting fixes, and cross-environment verification after.
---

# Debug Workflow

## Before touching any code

1. **Read the full error** — copy the exact error message, file, and line number. Don't skim.
2. **Identify the environment**: dev (SQLite, local venv) or production (Postgres, Fly.io)? Which Python version (3.12 / 3.13)? Which Node version?
3. **Form a hypothesis** — state the root cause in one sentence before writing any fix. If you can't, keep reading.

## Common root causes to check first

- **Postgres vs SQLite**: boolean defaults (`DEFAULT 0` fails in Postgres — use `DEFAULT FALSE`), `INTEGER PRIMARY KEY` without a sequence (use `SERIAL` or let SQLAlchemy handle it), `DROP TABLE` without `CASCADE`
- **Wrong venv**: run `which python` — if it doesn't point inside `.venv/`, stop and activate the correct one
- **Stale server**: backend schema changes require a server restart (`uvicorn app.main:app --reload`)
- **Missing `git add`**: pre-commit stashes untracked files — new files must be staged before committing
- **TypeScript**: run `npx tsc --noEmit` before assuming a type error is in the logic

## Fix

4. Implement the minimal fix for the identified root cause. Do not refactor surrounding code.
5. Run the relevant test(s) immediately after the fix — don't batch fixes.

## Verify

6. **Frontend changes**: run `cd frontend && npm run lint && npx tsc --noEmit`
7. **Backend changes**: run `source .venv/bin/activate && flake8 . --max-line-length=100 && pytest -q tests/`
8. **Migration changes**: verify against both SQLite (local) and Postgres (production) — check that the column/table exists in Neon after deploy: `fly ssh console --app travel-planner-api-weathered-tree-9345 --command "bash -c 'cd /app && python -c \"from database import engine; from sqlalchemy import inspect; print(inspect(engine).get_columns(\\\"<table>\\\"))\"'"`
9. **If the fix doesn't work**: do not retry the same approach. Re-read the error, revise the hypothesis, and start from step 3.
