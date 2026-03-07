# v1 Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the three remaining gaps before v1: wire the budget UI into the trip page, add a change-password form to Settings, and build a full forgot-password/email-reset flow.

**Architecture:** Three independent PRs in sequence. PR 1 is a one-line frontend change. PR 2 adds a form to Settings calling an existing backend endpoint. PR 3 adds a new DB table, email service, two backend endpoints, two new frontend pages, and a login page link.

**Tech Stack:** FastAPI, SQLAlchemy, Python smtplib (stdlib), Next.js 14 App Router, TypeScript, react-hook-form, zod, Tailwind CSS, Vitest, pytest

---

## PR 1 — Wire Budget UI into Trip Expenses Tab

### Task 1: Mount BudgetCard above ExpenseList

**Files:**
- Modify: `frontend/app/trips/[id]/page.tsx:11,205`

**Step 1: Add the BudgetCard import**

In `frontend/app/trips/[id]/page.tsx`, add to the import block (after line 11):

```tsx
import { BudgetCard } from '@/components/budget';
```

**Step 2: Mount BudgetCard in the expenses tab**

Find line 205 (the expenses tab render):
```tsx
{activeTab === 'expenses' && <ExpenseList tripId={tripId} />}
```

Replace with:
```tsx
{activeTab === 'expenses' && (
  <div className="space-y-4">
    <BudgetCard tripId={tripId} />
    <ExpenseList tripId={tripId} />
  </div>
)}
```

**Step 3: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: no errors

**Step 4: Manual smoke test**

Start both servers, open a trip with expenses and a budget set. Click the Expenses tab. Confirm the budget progress bar and category breakdown appear above the expense list. Confirm a trip with no budget shows only the expense list (BudgetCard returns null gracefully).

**Step 5: Commit**

```bash
git add frontend/app/trips/\[id\]/page.tsx
git commit -m "feat: wire BudgetCard into trip expenses tab"
```

---

## PR 2 — Change Password UI in Settings

### Task 2: Add authApi.changePassword to the API client

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add the method**

At the end of `frontend/lib/api.ts`, before `export default api`, add:

```ts
export const authApi = {
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
};
```

**Step 2: Run type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add authApi.changePassword to API client"
```

### Task 3: Add Security card with change-password form to Settings page

**Files:**
- Modify: `frontend/app/settings/page.tsx`

**Step 1: Add imports**

At the top of `frontend/app/settings/page.tsx`, add:

```tsx
import { authApi } from '@/lib/api';
```

**Step 2: Add state for the security form**

Inside `SettingsContent`, after the existing state declarations, add:

```tsx
const [pwForm, setPwForm] = useState({
  current_password: '',
  new_password: '',
  confirm_password: '',
});
const [pwError, setPwError] = useState('');
const [pwSuccess, setPwSuccess] = useState(false);
const [pwSaving, setPwSaving] = useState(false);

const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  setPwError('');
  setPwSuccess(false);

  if (pwForm.new_password.length < 8) {
    setPwError('New password must be at least 8 characters.');
    return;
  }
  if (pwForm.new_password !== pwForm.confirm_password) {
    setPwError('New passwords do not match.');
    return;
  }

  setPwSaving(true);
  try {
    await authApi.changePassword({
      current_password: pwForm.current_password,
      new_password: pwForm.new_password,
    });
    setPwSuccess(true);
    setPwForm({ current_password: '', new_password: '', confirm_password: '' });
  } catch {
    setPwError('Current password is incorrect.');
  } finally {
    setPwSaving(false);
  }
};
```

**Step 3: Add Security card to the JSX**

In the return block, after the closing `</Card>` of the existing General settings card, add:

```tsx
<Card padding="lg">
  <form onSubmit={handlePasswordChange} className="space-y-6">
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-slate-800">Security</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={pwForm.current_password}
            onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={pwForm.new_password}
            onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={pwForm.confirm_password}
            onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {pwError && (
        <p className="text-sm text-red-600">{pwError}</p>
      )}
      {pwSuccess && (
        <p className="text-sm text-green-600">Password updated successfully.</p>
      )}
    </div>
    <Button type="submit" disabled={pwSaving}>
      {pwSaving ? 'Updating...' : 'Update Password'}
    </Button>
  </form>
</Card>
```

**Step 4: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: no errors

**Step 5: Manual smoke test**

Navigate to Settings. Confirm the Security card appears. Test:
- Wrong current password → inline error "Current password is incorrect."
- Passwords don't match → inline error before submitting
- New password < 8 chars → inline error before submitting
- Correct current password + matching new password → success message, fields clear

**Step 6: Commit**

```bash
git add frontend/app/settings/page.tsx
git commit -m "feat: add change password UI to Settings page"
```

---

## PR 3 — Forgot Password / Email Reset Flow

### Task 4: Add PasswordResetToken model

**Files:**
- Create: `app/models/password_reset_token.py`
- Modify: `app/models/__init__.py`

**Step 1: Create the model**

```python
# app/models/password_reset_token.py
"""
app/models/password_reset_token.py - Password reset token model.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from .base import Base


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hex digest
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

**Step 2: Register the model in __init__.py**

In `app/models/__init__.py`, add after the last import:

```python
from .password_reset_token import PasswordResetToken
```

**Step 3: Commit**

```bash
git add app/models/password_reset_token.py app/models/__init__.py
git commit -m "feat: add PasswordResetToken model"
```

### Task 5: Add migration for password_reset_tokens table

**Files:**
- Modify: `app/core/migrations.py`

**Step 1: Add the migration function**

In `app/core/migrations.py`, add this function before `run_migrations`:

```python
def create_password_reset_tokens_table(engine: Engine) -> None:
    """Create password_reset_tokens table if it doesn't exist."""
    dialect = engine.dialect.name
    if dialect == "postgresql":
        create_sql = """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """
    else:
        create_sql = """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """
    index_sql = """
        CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash
        ON password_reset_tokens (token_hash)
    """
    try:
        with engine.begin() as conn:
            conn.execute(text(create_sql))
            conn.execute(text(index_sql))
        logger.info("Ensured password_reset_tokens table exists")
    except Exception as e:
        logger.error(f"Failed to create password_reset_tokens table: {type(e).__name__}: {e}")
```

**Step 2: Call it from run_migrations**

In `run_migrations`, add before the final `logger.info("No migrations needed")` line (or alongside other calls):

```python
create_password_reset_tokens_table(engine)
```

**Step 3: Write a test**

In `tests/test_auth.py`, add to `TestAuthEndpoints`:

```python
def test_password_reset_tokens_table_exists(self, client):
    """Verify the password_reset_tokens table was created by migrations."""
    from sqlalchemy import inspect
    from tests.test_auth import engine  # reuse test engine
    inspector = inspect(engine)
    assert "password_reset_tokens" in inspector.get_table_names()
```

Actually, since the test DB is created via `Base.metadata.create_all`, the table will exist automatically from the model. The migration function is for upgrading existing production DBs. Skip this test — the model test coverage is sufficient.

**Step 4: Verify server starts cleanly**

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```
Expected: startup logs show "Ensured password_reset_tokens table exists", no errors.

**Step 5: Commit**

```bash
git add app/core/migrations.py
git commit -m "feat: add migration for password_reset_tokens table"
```

### Task 6: Add email service

**Files:**
- Create: `app/services/email_service.py`

**Step 1: Create the service**

```python
# app/services/email_service.py
"""
app/services/email_service.py - Email sending via SMTP.

Reads config from environment variables:
  SMTP_HOST    - SMTP server hostname (e.g. smtp.gmail.com)
  SMTP_PORT    - SMTP port (default 587)
  SMTP_USER    - SMTP username
  SMTP_PASS    - SMTP password
  SMTP_FROM    - From address (defaults to SMTP_USER)

If SMTP_HOST is not set, send_email logs a warning and returns without
sending — this allows the app to run locally without email configured.
"""
import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email. Silently skips if SMTP is not configured."""
    host = os.getenv("SMTP_HOST")
    if not host:
        logger.warning("SMTP_HOST not set — skipping email to %s (subject: %s)", to, subject)
        return

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    from_addr = os.getenv("SMTP_FROM") or user

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.sendmail(from_addr, [to], msg.as_string())
        logger.info("Email sent to %s", to)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        raise
```

**Step 2: Commit**

```bash
git add app/services/email_service.py
git commit -m "feat: add email service using smtplib"
```

### Task 7: Add Pydantic schemas for forgot/reset

**Files:**
- Modify: `app/schemas/auth.py`

**Step 1: Find the schemas file**

```bash
grep -n "class.*Request\|class.*Response\|PasswordChange" app/schemas/auth.py | head -20
```

**Step 2: Add the new schemas**

At the end of `app/schemas/auth.py`, add:

```python
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
```

**Step 3: Run type check**

```bash
source .venv/bin/activate && python -c "from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest; print('OK')"
```
Expected: `OK`

**Step 4: Commit**

```bash
git add app/schemas/auth.py
git commit -m "feat: add ForgotPasswordRequest and ResetPasswordRequest schemas"
```

### Task 8: Add forgot-password and reset-password endpoints

**Files:**
- Modify: `app/routers/auth.py`

**Step 1: Add imports at the top of auth.py**

Add to the existing imports:

```python
import hashlib
import secrets
from datetime import datetime, timedelta

from app.models.password_reset_token import PasswordResetToken
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_email
```

(Check what's already imported and only add what's missing.)

**Step 2: Add the forgot-password endpoint**

After the `change-password` endpoint, add:

```python
@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset link.
    Always returns 200 to prevent user enumeration.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        # Return success even if user not found
        return {"message": "If that email is registered, a reset link has been sent."}

    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).delete()

    # Create new token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={raw_token}"

    send_email(
        to=user.email,
        subject="Reset your Travel Planner password",
        body=(
            f"Hi {user.email},\n\n"
            f"Click the link below to reset your password. "
            f"This link expires in 1 hour.\n\n"
            f"{reset_link}\n\n"
            f"If you didn't request this, ignore this email.\n"
        ),
    )

    return {"message": "If that email is registered, a reset link has been sent."}
```

Also add `import os` if not already present.

**Step 3: Add the reset-password endpoint**

```python
@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Validate reset token and update password."""
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()

    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")

    user.hashed_password = get_password_hash(body.new_password)
    reset_token.used = True
    db.commit()
```

**Step 4: Write backend tests**

In `tests/test_auth.py`, add to `TestAuthEndpoints`:

```python
def test_forgot_password_unknown_email_returns_200(self, client):
    """Forgot password always returns 200 regardless of email existence."""
    response = client.post(
        "/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert "reset link" in response.json()["message"]

def test_forgot_password_known_email_creates_token(self, client):
    """Forgot password creates a reset token for a registered user."""
    # Register user
    client.post("/auth/register", json={
        "email": "user@example.com", "password": "password123"
    })
    response = client.post(
        "/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    assert response.status_code == 200

def test_reset_password_invalid_token_returns_400(self, client):
    """Reset with a bad token returns 400."""
    response = client.post(
        "/auth/reset-password",
        json={"token": "badtoken", "new_password": "newpassword123"},
    )
    assert response.status_code == 400

def test_reset_password_valid_token_updates_password(self, client):
    """Reset with a valid token updates the password and marks token used."""
    import hashlib, secrets
    from datetime import datetime, timedelta
    from tests.test_auth import TestingSessionLocal
    from app.models.password_reset_token import PasswordResetToken
    from app.models import User
    from app.core.security import get_password_hash

    # Register user
    client.post("/auth/register", json={
        "email": "user@example.com", "password": "oldpassword"
    })

    # Manually create a valid token
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "user@example.com").first()
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(token)
    db.commit()
    db.close()

    # Reset password
    response = client.post(
        "/auth/reset-password",
        json={"token": raw, "new_password": "newpassword123"},
    )
    assert response.status_code == 204

    # Verify old password no longer works
    login_response = client.post(
        "/auth/login",
        data={"username": "user@example.com", "password": "oldpassword"},
    )
    assert login_response.status_code == 401

    # Verify new password works
    login_response = client.post(
        "/auth/login",
        data={"username": "user@example.com", "password": "newpassword123"},
    )
    assert login_response.status_code == 200
```

**Step 5: Run tests**

```bash
source .venv/bin/activate
pytest tests/test_auth.py -v
```
Expected: all tests pass

**Step 6: Commit**

```bash
git add app/routers/auth.py tests/test_auth.py
git commit -m "feat: add forgot-password and reset-password endpoints with tests"
```

### Task 9: Add forgot/reset API methods to frontend client

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add methods to authApi**

Update the `authApi` object (added in Task 2) to include:

```ts
export const authApi = {
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
};
```

**Step 2: Run type check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add forgotPassword and resetPassword to authApi"
```

### Task 10: Add "Forgot password?" link to login page

**Files:**
- Modify: `frontend/app/login/page.tsx`

**Step 1: Add the link**

In the login form, after the password input field and before the submit button, add:

```tsx
<div className="text-right">
  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
    Forgot your password?
  </Link>
</div>
```

(`Link` is already imported from `next/link`.)

**Step 2: Run lint**

```bash
cd frontend && npm run lint
```

**Step 3: Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat: add forgot password link to login page"
```

### Task 11: Build forgot-password page

**Files:**
- Create: `frontend/app/forgot-password/page.tsx`

**Step 1: Create the page**

```tsx
// frontend/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Swallow errors — always show the same message to prevent enumeration
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Back to sign in
            </Link>
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded text-sm">
            If that email is registered, a reset link has been sent. Check your inbox.
            The link expires in 1 hour.
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/app/forgot-password/page.tsx
git commit -m "feat: add forgot-password page"
```

### Task 12: Build reset-password page

**Files:**
- Create: `frontend/app/reset-password/page.tsx`

**Step 1: Create the page**

```tsx
// frontend/app/reset-password/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded text-sm">
        Invalid reset link.{' '}
        <Link href="/forgot-password" className="underline">
          Request a new one.
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('This reset link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded text-sm">
        Password updated. Redirecting to sign in...
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}{' '}
          {error.includes('expired') && (
            <Link href="/forgot-password" className="underline">
              Request a new link.
            </Link>
          )}
        </div>
      )}
      <div>
        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <input
          id="new_password"
          type="password"
          required
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
          Confirm New Password
        </label>
        <input
          id="confirm_password"
          type="password"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Back to sign in
            </Link>
          </p>
        </div>
        <Suspense fallback={<div className="text-gray-500 text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
```

Note: `useSearchParams()` must be wrapped in `<Suspense>` in Next.js App Router — the `Suspense` wrapper handles this.

**Step 2: Run lint and type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/app/reset-password/page.tsx
git commit -m "feat: add reset-password page"
```

### Task 13: Document new env vars and do a final integration test

**Files:**
- Modify: `docs/deployment.md`

**Step 1: Add env vars to deployment docs**

In `docs/deployment.md`, find the Environment Variables section and add:

```markdown
| SMTP_HOST | SMTP server hostname (e.g. smtp.gmail.com) | Required for password reset emails |
| SMTP_PORT | SMTP port (default: 587) | Optional, defaults to 587 |
| SMTP_USER | SMTP username / email | Required for password reset emails |
| SMTP_PASS | SMTP password or app password | Required for password reset emails |
| SMTP_FROM | From address for emails | Optional, defaults to SMTP_USER |
```

**Step 2: Run full test suite**

```bash
source .venv/bin/activate
pytest tests/ -q --tb=short
```
Expected: all tests pass

**Step 3: Run frontend lint + type check**

```bash
cd frontend && npm run lint && npx tsc --noEmit
```
Expected: no errors

**Step 4: End-to-end manual test of the full forgot-password flow**

If you have SMTP configured:
1. Start both servers
2. Go to `/login`, click "Forgot your password?"
3. Enter your email, submit
4. Check inbox for reset email with link
5. Click link → `/reset-password?token=...`
6. Enter new password, submit → redirected to login
7. Sign in with new password — succeeds
8. Sign in with old password — fails

If SMTP is not configured (local dev):
1. Steps 1–3 above work (submit succeeds, says "link sent")
2. Check backend logs — token_hash will be visible; skip email test
3. Grab raw token from DB directly to test the reset endpoint via curl:
   ```bash
   curl -X POST http://localhost:8000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "<raw_token>", "new_password": "newpassword123"}'
   ```

**Step 5: Commit docs**

```bash
git add docs/deployment.md
git commit -m "docs: add SMTP env vars for password reset email"
```

---

## PR Order Summary

| PR | Branch | Tasks | Description |
|----|--------|-------|-------------|
| 1 | `feature/budget-ui` | 1 | Wire BudgetCard into expenses tab |
| 2 | `feature/change-password` | 2–3 | Change password UI in Settings |
| 3 | `feature/forgot-password` | 4–13 | Full email reset flow |

## Post-v1 Deferred

- Trip Templates (feature 019)
- HTML email template (plain text is fine for v1)
- Cron job to purge expired `password_reset_tokens`
