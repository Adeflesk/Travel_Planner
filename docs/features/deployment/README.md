# Deployment & Infrastructure Features

This folder contains specifications for deployment and infrastructure-related features.

## Overview

These features prepare the Travel Planner application for production deployment, covering database migrations, environment configuration, and hosting setup.

## Recommended Implementation Order

1. **011 - Environment Config** (Low complexity) - Set up proper environment variable handling first
2. **010 - Alembic Migrations** (Medium complexity) - Enable safe database schema changes
3. **012 - Production Deployment** (High complexity) - Deploy to production environment
4. **013 - SQLite to PostgreSQL** (Medium complexity) - Only if migrating existing data

## Features

| # | Feature | Priority | Complexity | Status |
|---|---------|----------|------------|--------|
| 010 | [Alembic Migrations](./010-alembic-migrations.md) | High | Medium | Planned |
| 011 | [Environment Config](./011-environment-config.md) | High | Low | Planned |
| 012 | [Production Deployment](./012-production-deployment.md) | Medium | High | Planned |
| 013 | [SQLite to PostgreSQL Migration](./013-sqlite-to-postgres-migration.md) | Low | Medium | Planned |

## Quick Start

### Development Setup
The application currently uses SQLite for development, which requires no additional setup.

### Production Requirements
- PostgreSQL database
- Environment variables configured (see 011)
- Alembic migrations applied (see 010)
- HTTPS enabled
- Proper CORS configuration

## Status Key

- **Planned** - Documented, not started
- **In Progress** - Currently being implemented
- **Complete** - Implemented and tested
