# Deployment Guide

Deploy the Travel Planner app using **Fly.io** (backend) and **Vercel** (frontend) — both have generous free tiers.

## Prerequisites

- [Fly.io CLI](https://fly.io/docs/getting-started/installing-flyctl/) (`brew install flyctl`)
- [Vercel account](https://vercel.com/signup) (sign up with GitHub)
- GitHub repository with the project pushed

## Backend — Fly.io

### 1. Create the app

```bash
fly auth login
fly launch --no-deploy
# When prompted:
#   App name: travel-planner-api (or your choice)
#   Region: pick the closest to your users
#   Don't set up a Postgres database yet (we'll do it next)
```

### 2. Create a Postgres database

```bash
fly postgres create --name travel-planner-db
# Pick the "Development" plan (free, single node, 1GB)

fly postgres attach travel-planner-db
# This automatically sets DATABASE_URL as a secret
```

### 3. Set secrets

```bash
# Generate a strong secret key
fly secrets set JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Set your frontend URL (update after Vercel deploy)
fly secrets set FRONTEND_URL=https://your-app.vercel.app

# Optional: Weather API
fly secrets set OPENWEATHER_API_KEY=your-key-here
```

### 4. Deploy

```bash
fly deploy
```

### 5. Verify

```bash
fly status
curl https://travel-planner-api.fly.dev/health
```

### Create initial admin user

**Option 1: Using Python script (recommended)**

```bash
fly ssh console
source /opt/venv/bin/activate

# Create a script file
cat > create_admin.py << 'SCRIPT'
from database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User

db = SessionLocal()

# Check if admin already exists
existing = db.query(User).filter(User.email == 'admin@example.com').first()
if existing:
    print('Admin user already exists!')
else:
    admin = User(
        email='admin@example.com',
        hashed_password=get_password_hash('YourSecurePassword'),
        full_name='Admin',
        role='admin',
        is_active=True
    )
    db.add(admin)
    db.commit()
    print('Admin created successfully!')
SCRIPT

python create_admin.py
```

**Option 2: Direct SQL (for Postgres)**

```bash
# Connect to your Postgres database
fly postgres connect -a travel-planner-db

-- Check tables exist
\dt

-- Insert admin user (replace password with your own)
INSERT INTO users (email, hashed_password, full_name, role, is_active, created_at, updated_at)
SELECT
    'admin@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY7KK3p5PDFJ7Ry',  -- bcrypt hash of 'admin123'
    'Admin',
    'admin',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@example.com'
);
```

**To generate a new password hash locally:**
```bash
python -c "from app.core.security import get_password_hash; print(get_password_hash('your-password'))"
```

## Frontend — Vercel

### 1. Import project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework will auto-detect as Next.js

### 2. Set environment variables

In Vercel project settings > Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://travel-planner-api.fly.dev` |

### 3. Deploy

Click "Deploy" — Vercel handles the rest.

### 4. Update backend CORS

After getting your Vercel URL, update the backend:

```bash
fly secrets set FRONTEND_URL=https://your-actual-app.vercel.app
```

## Environment Variables Reference

### Backend (Fly.io secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Set automatically by `fly postgres attach` |
| `JWT_SECRET_KEY` | Yes | Secret for signing JWT tokens |
| `FRONTEND_URL` | Yes | Your Vercel frontend URL (for CORS) |
| `ENVIRONMENT` | No | Set to `production` in fly.toml |
| `OPENWEATHER_API_KEY` | No | For weather forecasts |
| `WEATHER_CACHE_TTL` | No | Cache duration in seconds (default: 21600) |
| `CORS_ORIGINS` | No | Additional CORS origins (comma-separated) |

### Frontend (Vercel env vars)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Your Fly.io backend URL |

## Custom Domains

### Fly.io
```bash
fly certs create api.yourdomain.com
# Then add a CNAME record pointing to your-app.fly.dev
```

### Vercel
1. Go to project Settings > Domains
2. Add your domain
3. Follow DNS instructions

## Troubleshooting

### Backend won't start
```bash
fly logs              # Check recent logs
fly status            # Check machine status
fly ssh console       # SSH into the machine
```

### Database connection issues
```bash
fly postgres connect -a travel-planner-db   # Connect to Postgres directly
fly postgres list                           # Check database status
```

### CORS errors
Make sure `FRONTEND_URL` matches your exact Vercel URL (including `https://`):
```bash
fly secrets list      # Verify secrets are set
fly secrets set FRONTEND_URL=https://correct-url.vercel.app
```

### Cold starts
Free-tier machines auto-stop after inactivity. First request after sleep takes ~3-5 seconds. This is normal.

## Cost Summary

| Service | Free Tier Includes |
|---------|-------------------|
| Fly.io | 3 shared VMs, 256MB RAM each, 3GB persistent storage |
| Fly Postgres | 1GB storage on Development plan |
| Vercel | 100GB bandwidth/month, serverless functions, edge network |
