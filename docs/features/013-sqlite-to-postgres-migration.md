# Feature: SQLite to PostgreSQL Data Migration

**Status:** Planned
**Priority:** Low (only if existing data needs migration)
**Complexity:** Medium
**Category:** Infrastructure

## Overview

Migrate existing data from SQLite development database to PostgreSQL for production.

## When to Use

- You have data in `travel_planner.db` you want to keep
- Moving from local development to production
- Not needed if starting fresh with PostgreSQL

## Approach

### Option A: pgloader (Recommended)
Automated tool for SQLite → PostgreSQL migration.

```bash
# Install pgloader
brew install pgloader  # macOS

# Create migration config
# sqlite-to-pg.load
LOAD DATABASE
    FROM sqlite:///path/to/travel_planner.db
    INTO postgresql://user:pass@localhost/travel_planner
WITH include drop, create tables, create indexes, reset sequences
SET work_mem to '16MB', maintenance_work_mem to '512 MB';
```

### Option B: Python Script
Custom script for more control.

```python
# scripts/migrate_sqlite_to_postgres.py
import sqlite3
from sqlalchemy import create_engine
from app.models import Base, Trip, User, Destination, Journey, etc.

# Connect to both databases
sqlite_conn = sqlite3.connect('travel_planner.db')
pg_engine = create_engine(os.getenv('DATABASE_URL'))

# For each table, read from SQLite, insert to PostgreSQL
# Handle foreign keys in correct order
```

### Option C: SQL Export/Import
Manual but simple.

```bash
# Export from SQLite
sqlite3 travel_planner.db .dump > backup.sql

# Clean up SQLite-specific syntax
# Import to PostgreSQL (requires manual SQL adjustments)
```

## Migration Order (Foreign Key Dependencies)

1. users
2. trips
3. destinations
4. journeys
5. activities
6. accommodations
7. expenses
8. packing_items

## Files to Create

- `scripts/migrate_sqlite_to_postgres.py`
- Or `sqlite-to-pg.load` (pgloader config)

## Pre-Migration Checklist

- [ ] Backup SQLite database
- [ ] PostgreSQL database created and empty
- [ ] Alembic migrations applied to PostgreSQL
- [ ] Test migration on copy first

## Acceptance Criteria

- [ ] All data migrated successfully
- [ ] Foreign key relationships intact
- [ ] No data loss
- [ ] Application works with migrated data
