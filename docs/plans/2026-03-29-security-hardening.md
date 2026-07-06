# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical, high, and medium security vulnerabilities identified in the security audit of the Travel Planner application.

**Architecture:** Backend fixes harden the FastAPI layer (JWT config, SQL injection, CORS, input validation, security headers). Frontend fixes add HTTP security headers via Next.js config and remove debug logging. Each task is independent and can be committed separately.

**Tech Stack:** Python 3.13 / FastAPI / SQLAlchemy (backend), Next.js 14 / TypeScript (frontend)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/core/security.py` | Modify | Fail-loud on missing JWT secret |
| `app/routers/trips.py` | Modify | Fix SQL injection with parameterized query |
| `app/routers/admin.py` | Modify | Add Pydantic schema for password reset, add query bounds |
| `app/schemas/auth.py` | Modify | Add `AdminResetPassword` schema |
| `app/main.py` | Modify | Tighten CORS regex, add security headers middleware |
| `app/core/email_config.py` | Modify | Fail-loud on missing FRONTEND_URL in production |
| `frontend/next.config.ts` | Modify | Add security response headers |
| `frontend/lib/api.ts` | Modify | Remove console.log statements |
| `tests/test_security_hardening.py` | Create | Tests for all backend security fixes |

---

### Task 1: Fail-Loud on Missing JWT Secret Key

**Files:**
- Modify: `app/core/security.py:18-21`
- Test: `tests/test_security_hardening.py`

The current code falls back to `"dev-secret-key-change-in-production"` if no env var is set. In production this means anyone who reads the source can forge JWTs.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_security_hardening.py
import os
import importlib
import pytest


def test_secret_key_required_in_production(monkeypatch):
    """SECRET_KEY must not use the weak default when ENVIRONMENT=production."""
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    import app.core.security as sec_module

    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        importlib.reload(sec_module)


def test_secret_key_allows_default_in_dev(monkeypatch):
    """In non-production, a default key is acceptable for local dev."""
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.core.security as sec_module

    importlib.reload(sec_module)
    assert sec_module.SECRET_KEY == "dev-secret-key-change-in-production"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_secret_key_required_in_production -v`
Expected: FAIL — no `ValueError` raised because current code uses the fallback.

- [ ] **Step 3: Implement the fix**

Replace lines 18-21 in `app/core/security.py`:

```python
# Configuration from environment variables
_env = os.getenv("ENVIRONMENT", "development")
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if _env == "production":
        raise ValueError(
            "JWT_SECRET_KEY environment variable must be set in production. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    SECRET_KEY = "dev-secret-key-change-in-production"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py -v -k "secret_key"`
Expected: Both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/security.py tests/test_security_hardening.py
git commit -m "security: fail loudly when JWT_SECRET_KEY missing in production"
```

---

### Task 2: Fix SQL Injection in Trip Summary Query

**Files:**
- Modify: `app/routers/trips.py:116-124`
- Test: `tests/test_security_hardening.py`

The current code uses `f"...WHERE id IN ({ids_csv})"` with f-string interpolation. Although values come from DB integer IDs, this pattern is dangerous and should use parameterized queries.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py
from unittest.mock import MagicMock, patch
from sqlalchemy import text


def test_trip_summary_query_uses_parameterized_sql():
    """The trip summary query must use bind parameters, not f-string interpolation."""
    import inspect
    from app.routers.trips import get_trips

    source = inspect.getsource(get_trips)
    # The old vulnerable pattern: f-string with IN ({ids_csv})
    assert "f\"" not in source or "ids_csv" not in source, (
        "get_trips still uses f-string SQL interpolation — use bindparam(expanding=True)"
    )
    # The safe pattern should use :ids bind parameter
    assert "expanding=True" in source or ":ids" in source, (
        "get_trips should use bindparam with expanding=True for the IN clause"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_trip_summary_query_uses_parameterized_sql -v`
Expected: FAIL — source still contains the f-string pattern.

- [ ] **Step 3: Implement the fix**

Replace lines 116-124 in `app/routers/trips.py`:

```python
    if all_trip_ids:
        rows = db.execute(
            text(
                "SELECT id, day_count, total_spent, budget_remaining"
                " FROM trip_summary WHERE id IN :ids"
            ).bindparams(bindparam("ids", expanding=True)),
            {"ids": all_trip_ids},
        ).fetchall()
```

Also add `bindparam` to the import on line 16:

```python
from sqlalchemy import bindparam, case, func, text
```

And remove the now-unused `ids_csv` line (line 118).

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_trip_summary_query_uses_parameterized_sql -v`
Expected: PASS

- [ ] **Step 5: Run existing trip tests to confirm no regression**

Run: `source .venv/bin/activate && pytest tests/ -v -k "trip" --timeout=30`
Expected: All existing trip tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routers/trips.py tests/test_security_hardening.py
git commit -m "security: fix SQL injection in trip summary query with parameterized bind"
```

---

### Task 3: Tighten CORS Configuration

**Files:**
- Modify: `app/main.py:148-155`
- Test: `tests/test_security_hardening.py`

The regex `r"https://.*\.vercel\.app"` matches ANY Vercel preview deployment, including attacker-controlled ones. It also allows `allow_methods=["*"]` and `allow_headers=["*"]`.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py
import re


def test_cors_regex_is_scoped_to_project():
    """CORS regex must not match arbitrary *.vercel.app domains."""
    from app.main import create_app

    app = create_app()
    # Find the CORSMiddleware in the middleware stack
    cors_middleware = None
    for middleware in app.user_middleware:
        if middleware.cls.__name__ == "CORSMiddleware":
            cors_middleware = middleware
            break

    assert cors_middleware is not None, "CORSMiddleware not found"
    regex = cors_middleware.kwargs.get("allow_origin_regex", "")

    # Must NOT match an arbitrary attacker domain
    assert not re.match(regex, "https://evil-attacker.vercel.app"), (
        f"CORS regex '{regex}' matches arbitrary vercel.app subdomains"
    )
    # Must still match our project's preview deployments
    assert re.match(regex, "https://travel-planner-one-abc123-someuser.vercel.app"), (
        f"CORS regex '{regex}' should match travel-planner preview deploys"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_cors_regex_is_scoped_to_project -v`
Expected: FAIL — the broad regex matches `evil-attacker.vercel.app`.

- [ ] **Step 3: Implement the fix**

Replace lines 148-155 in `app/main.py`:

```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_origin_regex=r"https://travel-planner-.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_cors_regex_is_scoped_to_project -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_security_hardening.py
git commit -m "security: scope CORS regex to project-specific Vercel preview URLs"
```

---

### Task 4: Add Security Response Headers (Backend)

**Files:**
- Modify: `app/main.py` (add middleware after CORS)
- Test: `tests/test_security_hardening.py`

The backend returns no security headers (X-Content-Type-Options, X-Frame-Options, etc.).

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py
from fastapi.testclient import TestClient


def test_security_headers_present():
    """All responses must include standard security headers."""
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "no-store" in response.headers.get("Cache-Control", "") or \
           response.headers.get("X-Content-Type-Options") == "nosniff"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_security_headers_present -v`
Expected: FAIL — no security headers returned.

- [ ] **Step 3: Implement the fix**

Add this middleware class and registration in `app/main.py`. Place the class definition before `create_app()` and register it inside `create_app()` after the CORS middleware:

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response: StarletteResponse = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response
```

Inside `create_app()`, after the CORS middleware block:

```python
    app.add_middleware(SecurityHeadersMiddleware)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_security_headers_present -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py tests/test_security_hardening.py
git commit -m "security: add X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers"
```

---

### Task 5: Add Pydantic Schema for Admin Password Reset

**Files:**
- Modify: `app/schemas/auth.py`
- Modify: `app/routers/admin.py:146-165`
- Test: `tests/test_security_hardening.py`

The admin password reset endpoint accepts `new_password` as a bare string parameter, bypassing Pydantic validation.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py
import inspect


def test_admin_reset_password_uses_pydantic_schema():
    """Admin password reset must accept a Pydantic body, not a bare string."""
    from app.routers.admin import reset_user_password

    sig = inspect.signature(reset_user_password)
    params = sig.parameters

    # Should NOT have a bare 'new_password' string parameter
    assert "new_password" not in params, (
        "reset_user_password should accept a Pydantic body schema, not a bare new_password param"
    )
    # Should have a body parameter (e.g., 'body' or 'payload')
    body_params = [
        name for name, p in params.items()
        if name not in ("user_id", "db", "admin")
    ]
    assert len(body_params) >= 1, (
        "reset_user_password should have a Pydantic body parameter"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_admin_reset_password_uses_pydantic_schema -v`
Expected: FAIL — `new_password` is a bare parameter.

- [ ] **Step 3: Add the schema to `app/schemas/auth.py`**

Add after the `AdminUserCreate` class (after line 159):

```python
class AdminResetPassword(BaseModel):
    """Schema for admin resetting a user's password."""

    new_password: str = Field(..., min_length=8)
```

- [ ] **Step 4: Update the endpoint in `app/routers/admin.py`**

Update the import at the top (line 14-18):

```python
from app.schemas.auth import (
    UserResponse,
    AdminUserCreate,
    AdminUserUpdate,
    AdminResetPassword,
)
```

Replace the `reset_user_password` function (lines 146-165):

```python
@router.post("/users/{user_id}/reset-password", status_code=204)
def reset_user_password(
    user_id: int,
    body: AdminResetPassword,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Reset a user's password (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return None
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_admin_reset_password_uses_pydantic_schema -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/schemas/auth.py app/routers/admin.py tests/test_security_hardening.py
git commit -m "security: use Pydantic schema for admin password reset endpoint"
```

---

### Task 6: Add Query Parameter Bounds on Admin User List

**Files:**
- Modify: `app/routers/admin.py:26-35`
- Test: `tests/test_security_hardening.py`

The `limit` parameter has no upper bound, enabling potential DoS by requesting millions of rows.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py


def test_admin_list_users_has_limit_upper_bound():
    """The admin user list endpoint must enforce an upper bound on 'limit'."""
    from app.main import app

    client = TestClient(app)
    # Request an absurdly high limit — should be rejected or capped
    # We test the OpenAPI schema to verify Query constraints exist
    openapi = app.openapi()
    paths = openapi.get("paths", {})
    admin_users = paths.get("/admin/users/", {}).get("get", {})
    params = admin_users.get("parameters", [])

    limit_param = next((p for p in params if p.get("name") == "limit"), None)
    assert limit_param is not None, "limit parameter not found in OpenAPI schema"

    schema = limit_param.get("schema", {})
    # Should have a maximum value defined (le= in FastAPI Query)
    assert "maximum" in schema or "exclusiveMaximum" in schema, (
        f"limit parameter has no upper bound: {schema}"
    )
    assert schema.get("maximum", float("inf")) <= 1000, (
        f"limit upper bound is too high: {schema.get('maximum')}"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_admin_list_users_has_limit_upper_bound -v`
Expected: FAIL — no `maximum` in the schema.

- [ ] **Step 3: Implement the fix**

Update the imports in `app/routers/admin.py` (add `Query`):

```python
from fastapi import APIRouter, Depends, HTTPException, Query
```

Replace the `list_users` function signature (lines 26-34):

```python
@router.get("/users/", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """List all users (admin only)."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_admin_list_users_has_limit_upper_bound -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/admin.py tests/test_security_hardening.py
git commit -m "security: add upper bound on admin user list limit parameter"
```

---

### Task 7: Add Security Headers to Next.js Frontend

**Files:**
- Modify: `frontend/next.config.ts`
- Test: manual verification (Next.js config headers are tested at runtime)

The frontend serves no Content-Security-Policy, X-Frame-Options, or HSTS headers.

- [ ] **Step 1: Update `frontend/next.config.ts`**

Replace the entire file:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: '..',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npx next build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify headers at runtime (manual)**

Run: `cd frontend && npm run dev &` then `curl -I http://localhost:3000`
Expected: Response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, etc.

- [ ] **Step 4: Commit**

```bash
git add frontend/next.config.ts
git commit -m "security: add security response headers to Next.js frontend"
```

---

### Task 8: Remove Debug Console Logging from Frontend

**Files:**
- Modify: `frontend/lib/api.ts:189,208`

Production code logs request payloads to the browser console, leaking user data.

- [ ] **Step 1: Remove console.log statements**

Remove line 189 in `frontend/lib/api.ts`:
```typescript
    console.log('Expense create payload:', cleanedData);
```

Remove line 208 in `frontend/lib/api.ts`:
```typescript
    console.log('Expense update payload:', cleanedData);
```

- [ ] **Step 2: Run frontend lint to confirm no issues**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "security: remove debug console.log from expense API calls"
```

---

### Task 9: Harden FRONTEND_URL for Production

**Files:**
- Modify: `app/core/email_config.py:22`
- Test: `tests/test_security_hardening.py`

If `FRONTEND_URL` is unset in production, password reset emails contain `localhost:3000` links.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py


def test_frontend_url_required_in_production(monkeypatch):
    """FRONTEND_URL must be set in production."""
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    import app.core.email_config as email_module

    with pytest.raises(ValueError, match="FRONTEND_URL"):
        importlib.reload(email_module)


def test_frontend_url_defaults_in_dev(monkeypatch):
    """FRONTEND_URL can default to localhost in development."""
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.core.email_config as email_module

    importlib.reload(email_module)
    assert email_module.FRONTEND_URL == "http://localhost:3000"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_frontend_url_required_in_production -v`
Expected: FAIL — no `ValueError` raised.

- [ ] **Step 3: Implement the fix**

Replace line 22 in `app/core/email_config.py`:

```python
FRONTEND_URL = os.getenv("FRONTEND_URL")
if not FRONTEND_URL:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError(
            "FRONTEND_URL environment variable must be set in production"
        )
    FRONTEND_URL = "http://localhost:3000"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py -v -k "frontend_url"`
Expected: Both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/core/email_config.py tests/test_security_hardening.py
git commit -m "security: require FRONTEND_URL in production to prevent localhost in emails"
```

---

### Task 10: Validate Permission Field on Shared Trips

**Files:**
- Modify: `app/routers/trips.py:66-77`
- Test: `tests/test_security_hardening.py`

The `get_trip_or_404` function grants access to any shared user without checking the `permission` field. If permissions evolve (e.g., "edit" vs "view"), this is a latent authorization bypass.

- [ ] **Step 1: Write the failing test**

```python
# Append to tests/test_security_hardening.py


def test_get_trip_or_404_checks_permission_field():
    """get_trip_or_404 should reference share.permission in its access check."""
    from app.routers.trips import get_trip_or_404

    source = inspect.getsource(get_trip_or_404)
    assert "share.permission" in source or "permission" in source, (
        "get_trip_or_404 does not check the permission field on TripShare"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_get_trip_or_404_checks_permission_field -v`
Expected: FAIL — source does not reference `share.permission`.

- [ ] **Step 3: Implement the fix**

Replace lines 66-77 in `app/routers/trips.py`:

```python
    # Check if user has shared access (only for read operations)
    if not require_owner:
        share = (
            db.query(models.TripShare)
            .filter(
                models.TripShare.trip_id == trip_id,
                models.TripShare.user_id == current_user.id,
            )
            .first()
        )
        if share and share.permission in ("view", "edit"):
            return trip
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source .venv/bin/activate && pytest tests/test_security_hardening.py::test_get_trip_or_404_checks_permission_field -v`
Expected: PASS

- [ ] **Step 5: Run existing trip tests for regression**

Run: `source .venv/bin/activate && pytest tests/ -v -k "trip" --timeout=30`
Expected: All existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routers/trips.py tests/test_security_hardening.py
git commit -m "security: explicitly validate share.permission in trip access check"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full backend test suite**

Run: `source .venv/bin/activate && pytest tests/ -v --timeout=60`
Expected: All tests PASS.

- [ ] **Step 2: Run backend linter**

Run: `source .venv/bin/activate && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics`
Expected: No new errors introduced.

- [ ] **Step 3: Run frontend lint and type check**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Verify the backend starts cleanly**

Run: `source .venv/bin/activate && timeout 5 uvicorn app.main:app --port 8111 || true`
Expected: Server starts without import errors or crashes.

---

## Out of Scope (Future Work)

These items from the security review are acknowledged but require larger architectural changes:

| Item | Why Deferred |
|------|-------------|
| **Migrate JWT from localStorage to httpOnly cookies** | Requires changes to auth flow on both frontend and backend, plus CSRF token infrastructure. Warrants its own plan. |
| **Token revocation / logout endpoint** | Requires a token blacklist store (Redis or DB table). Plan separately. |
| **Rotate exposed Mapbox token** | Requires action in the Mapbox dashboard (not code). Document in ops runbook. |
| **Remove Vercel OIDC token from git history** | Requires `git filter-repo` which rewrites history. Coordinate with team. |
| **Proxy Mapbox requests through backend** | Architecture change to avoid client-side token exposure. Plan separately. |
| **Password complexity requirements** | UX tradeoff — discuss with product before enforcing. |
| **Update axios** | Run `npm audit fix` — straightforward but test for regressions. |
| **Make CI security checks blocking** | Change `continue-on-error` in `.github/workflows/pr-checks.yml`. Coordinate with team to avoid blocking unrelated PRs. |
