# Feature: Environment Configuration

**Status:** Planned
**Priority:** High
**Complexity:** Low
**Category:** Infrastructure

## Overview

Implement proper environment variable handling with `.env` files and validation.

## Requirements

1. Load environment variables from `.env` file
2. Validate required variables on startup
3. Separate configs for dev/staging/production
4. Keep secrets out of code and git

## Implementation

### Install python-dotenv
```bash
pip install python-dotenv
```

### Create .env file structure
```
.env              # Local development (gitignored)
.env.example      # Template with dummy values (committed)
.env.test         # Test environment (optional)
```

### Update database.py / config
```python
from dotenv import load_dotenv
load_dotenv()

# Validate required vars
required_vars = ["JWT_SECRET_KEY"]
for var in required_vars:
    if not os.getenv(var):
        raise ValueError(f"Missing required environment variable: {var}")
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | No | sqlite:///./travel_planner.db | Database connection string |
| JWT_SECRET_KEY | Yes (prod) | - | Secret for JWT signing |
| JWT_ALGORITHM | No | HS256 | JWT algorithm |
| ACCESS_TOKEN_EXPIRE_MINUTES | No | 30 | Token expiry |
| FRONTEND_URL | No | http://localhost:3000 | CORS allowed origin |
| ENVIRONMENT | No | development | dev/staging/production |

## Files to Modify

- `requirements.txt` (add python-dotenv)
- `database.py` or new `app/config.py`
- `.env.example` (already exists, verify complete)
- `.gitignore` (verify .env is ignored)

## Acceptance Criteria

- [ ] `.env` file loaded on startup
- [ ] Required variables validated
- [ ] Clear error messages for missing config
- [ ] `.env.example` documents all variables
- [ ] Secrets not committed to git
