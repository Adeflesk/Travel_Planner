# Feature: Alembic Database Migrations

**Status:** Planned
**Priority:** High
**Complexity:** Medium
**Category:** Infrastructure

## Overview

Set up Alembic for versioned database migrations to support safe schema changes in production.

## Why This Matters

- Current setup uses `Base.metadata.create_all()` which only creates new tables
- Cannot modify existing columns or add constraints safely
- No rollback capability
- Required for production PostgreSQL deployments

## Requirements

1. Initialize Alembic in the project
2. Generate initial migration from existing models
3. Support both SQLite (dev) and PostgreSQL (prod)
4. Auto-generate migrations from model changes
5. Document migration workflow

## Implementation Steps

### 1. Install Alembic
```bash
pip install alembic
pip freeze > requirements.txt
```

### 2. Initialize Alembic
```bash
alembic init alembic
```

### 3. Configure alembic.ini and env.py
- Point to existing database.py configuration
- Import all models for autogenerate

### 4. Create Initial Migration
```bash
alembic revision --autogenerate -m "initial schema"
```

### 5. Update Startup
- Remove `create_all()` from app startup
- Run migrations on deploy

## Files to Create/Modify

- `alembic.ini` (new)
- `alembic/env.py` (new)
- `alembic/versions/` (new directory)
- `app/main.py` (remove create_all)
- `requirements.txt` (add alembic)
- `CLAUDE.md` (document migration commands)

## Migration Commands

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View current version
alembic current

# View history
alembic history
```

## Acceptance Criteria

- [ ] Alembic initialized and configured
- [ ] Initial migration created from existing models
- [ ] Works with both SQLite and PostgreSQL
- [ ] Migration commands documented in CLAUDE.md
- [ ] Existing data preserved after migration
