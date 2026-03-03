---
name: deploy
description: Use before deploying to Fly.io. Runs pre-deploy checks and guides the deployment with known pitfall prevention.
---

# Deploy Workflow

## Pre-deploy checklist

1. **Confirm correct venv** — `which python` must point inside `.venv/`
2. **Run full lint + type check**:
   ```bash
   source .venv/bin/activate
   flake8 . --count --max-line-length=100 --max-complexity=10
   cd frontend && npm run lint && npx tsc --noEmit
   ```
3. **Check for migration changes** — if any model or schema file changed, ensure a corresponding migration exists in `app/core/migrations.py`
4. **Postgres compatibility check** for any new raw SQL migrations:
   - Boolean defaults: `DEFAULT TRUE`/`DEFAULT FALSE` (not `DEFAULT 1`/`DEFAULT 0`)
   - Primary key sequences: use `SERIAL PRIMARY KEY` or let SQLAlchemy handle it — never `INTEGER PRIMARY KEY` in raw SQL
   - Table drops with FK references: `DROP TABLE ... CASCADE`
5. **Commit and push** all changes first — `scripts/deploy.sh` syncs from the working directory

## Deploy

```bash
bash scripts/deploy.sh
```

## Post-deploy verification

6. **Check app is healthy**: `fly status --app travel-planner-api-weathered-tree-9345`
7. **Tail logs for errors**:
   ```bash
   fly logs --app travel-planner-api-weathered-tree-9345 --no-tail 2>&1 | grep -i "error\|exception\|traceback" | head -20
   ```
8. **Verify migrations ran** (if schema changed):
   ```bash
   fly ssh console --app travel-planner-api-weathered-tree-9345 --command "bash -c 'cd /app && python -c \"from database import engine; from sqlalchemy import inspect; i=inspect(engine); [print(t, [c[\\\"name\\\"] for c in i.get_columns(t)]) for t in i.get_table_names() if not t.startswith(\\\"pg_\\\")]\"'"
   ```
9. **Hit the health endpoint** to confirm the app is responding: `curl -s https://travel-planner-api-weathered-tree-9345.fly.dev/health`
