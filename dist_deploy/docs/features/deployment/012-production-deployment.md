# Feature: Production Deployment Setup

**Status:** Planned
**Priority:** Medium
**Complexity:** High
**Category:** Infrastructure

## Overview

Prepare the application for production deployment with proper configuration, security, and hosting setup.

## Deployment Options

### Option A: Railway (Recommended for simplicity)
- One-click PostgreSQL addon
- Auto-deploys from GitHub
- Built-in SSL
- ~$5-20/month

### Option B: Vercel (Frontend) + Railway (Backend)
- Vercel free tier for Next.js
- Railway for FastAPI + PostgreSQL
- Best performance for frontend

### Option C: Docker on VPS (DigitalOcean, Linode)
- Full control
- Use existing docker-compose
- More setup required
- ~$6-12/month

### Option D: Fly.io
- Good free tier
- PostgreSQL addon
- Edge deployment

## Pre-Deployment Checklist

### Security
- [ ] Generate strong JWT_SECRET_KEY
- [ ] Set CORS to production frontend URL only
- [ ] Enable HTTPS only
- [ ] Review rate limiting settings
- [ ] Remove debug mode / detailed errors

### Database
- [ ] Set up PostgreSQL instance
- [ ] Run Alembic migrations
- [ ] Set up database backups
- [ ] Connection pooling configured

### Environment
- [ ] All secrets in environment variables
- [ ] ENVIRONMENT=production
- [ ] Logging configured (not to console)

### Frontend
- [ ] NEXT_PUBLIC_API_URL points to production API
- [ ] Build optimizations enabled
- [ ] Error tracking (Sentry optional)

## Files to Create/Modify

- `Procfile` (for Heroku-style platforms)
- `railway.json` or `fly.toml` (platform-specific)
- `.github/workflows/deploy.yml` (CI/CD)
- `frontend/.env.production`

## Deployment Commands

### Railway
```bash
# Install CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Docker (VPS)
```bash
# On server
docker-compose -f docker-compose.prod.yml up -d
```

## Acceptance Criteria

- [ ] Application runs in production environment
- [ ] PostgreSQL database connected
- [ ] HTTPS enabled
- [ ] Environment variables configured
- [ ] CI/CD pipeline working (optional)
- [ ] Basic monitoring/logging in place
