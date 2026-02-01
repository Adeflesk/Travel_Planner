# Feature Documentation

This directory contains specifications for planned features.

## Feature Status Key

- **Planned** - Documented, not started
- **In Progress** - Currently being implemented
- **Complete** - Implemented and tested
- **On Hold** - Deprioritized or blocked

## Features Index

### Application Features

| # | Feature | Priority | Complexity | Status |
|---|---------|----------|------------|--------|
| 001 | [Journey Validation](./completed/001-journey-validation.md) | Medium | Low | Complete |
| 002 | [Currency Selection](./completed/002-currency-selection.md) | Low | Low | Complete |
| 003 | [Trip Cost Summary](./completed/003-trip-cost-summary.md) | High | Medium | Complete |
| 004 | [Journey Sorting](./completed/004-journey-sorting.md) | Medium | Low | Complete |
| 005 | [Duplicate Journey](./completed/005-duplicate-journey.md) | High | Low | Complete |
| 006 | [Timeline Accommodations](./completed/006-timeline-accommodations.md) | Medium | Medium | Complete |
| 007 | [Schedule Conflicts](./completed/007-schedule-conflicts.md) | Medium | Medium | Complete |
| 008 | [Export Itinerary](./completed/008-export-itinerary.md) | Medium | High | Complete |
| 009 | [Trip Statistics API](./completed/009-trip-statistics.md) | Low | Medium | Complete |

### Journey Enhancements

See [014-journey-enhancements-plan.md](./014-journey-enhancements-plan.md) for the planning document.

| # | Feature | Priority | Complexity | Status |
|---|---------|----------|------------|--------|
| 014 | [Journey Stops & Options](./completed/014-journey-stops.md) | High | Medium-High | Complete |
| 015 | [Journey Documents](./completed/015-journey-documents.md) | Medium | Low | Complete |
| 016 | [Route Details](./016-route-details.md) | Low | Medium | Planned |

### Infrastructure & Deployment

See [deployment/README.md](./deployment/README.md) for detailed deployment documentation.

| # | Feature | Priority | Complexity | Status |
|---|---------|----------|------------|--------|
| 010 | [Alembic Migrations](./deployment/010-alembic-migrations.md) | High | Medium | Planned |
| 011 | [Environment Config](./deployment/011-environment-config.md) | High | Low | Planned |
| 012 | [Production Deployment](./deployment/012-production-deployment.md) | Medium | High | Planned |
| 013 | [SQLite to PostgreSQL Migration](./deployment/013-sqlite-to-postgres-migration.md) | Low | Medium | Planned |

## Adding New Features

1. Create a new file: `XXX-feature-name.md`
2. Use the template below
3. Update this README index

## Template

```markdown
# Feature: [Name]

**Status:** Planned
**Priority:** High/Medium/Low
**Complexity:** Low/Medium/High

## Overview

Brief description of the feature.

## Requirements

1. Requirement one
2. Requirement two

## Approach

How to implement this feature.

## Files to Modify

- `path/to/file.ts`

## Acceptance Criteria

- [ ] Criteria one
- [ ] Criteria two
```
