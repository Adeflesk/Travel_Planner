# v1 Completion Design

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Three remaining items before calling the app version 1.0

## Context

The core travel planning loop is complete: Trip Wizard, Day Builder, Transport, Destinations, Accommodation, Activities, Packing, Expenses, Sharing, Dashboard, Help Center.

Three gaps remain:

1. Budget UI components are built but never rendered in the app
2. Users cannot change their own password (backend endpoint exists, no UI)
3. No self-service forgot-password flow (admin-only reset is the only option)

Each ships as a separate PR in sequence.

---

## PR 1 — Wire Budget UI into Trip Expenses Tab

### What

Mount `<BudgetCard tripId={tripId} />` above `<ExpenseList />` in the expenses tab of `frontend/app/trips/[id]/page.tsx`.

### Layout

```
Expenses tab
├── BudgetCard          ← add (budget progress bar + category breakdown)
└── ExpenseList         ← existing, unchanged
```

### Notes

- `BudgetCard` already handles loading states and returns `null` if no budget is set or an error occurs — no extra guard needed
- No backend changes required; `GET /trips/{id}/budget` already exists and is consumed by `useBudget`
- Only import needed: `import { BudgetCard } from '@/components/budget'`

### Files Changed

- `frontend/app/trips/[id]/page.tsx` — add BudgetCard above ExpenseList in the expenses tab branch

---

## PR 2 — Change Password UI in Settings

### What

Add a "Security" card to the Settings page with a form calling the existing `POST /auth/change-password` endpoint.

### Form Fields

| Field | Validation |
|-------|-----------|
| Current Password | required |
| New Password | required, min 8 chars |
| Confirm New Password | must match New Password |

### Behaviour

- Validation: client-side with react-hook-form + zod (consistent with rest of app)
- On success: clear all three fields, show inline green success message
- On error (wrong current password): show inline error on the Current Password field — no alert()
- No backend changes required

### Files Changed

- `frontend/app/settings/page.tsx` — add Security card section with password change form
- `frontend/lib/api.ts` — add `authApi.changePassword(data)` method

---

## PR 3 — Forgot Password / Email Reset Flow

### Overview

Full email-based reset: user requests a reset link, receives email, clicks link, sets new password.

### Backend

**New model — `PasswordResetToken`** (`app/models/password_reset_token.py`):
```
id          Integer PK
user_id     FK → users.id
token_hash  String (SHA-256 of the raw token; never store raw)
expires_at  DateTime (1 hour from creation)
used        Boolean default False
```

**Migration** — added to `app/core/migrations.py` on startup (consistent with existing pattern).

**New endpoints** in `app/routers/auth.py`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/forgot-password` | Public | Look up user by email, create token, send email. Always returns 200 (no user enumeration). |
| POST | `/auth/reset-password` | Public | Validate token (exists, not expired, not used), hash new password, mark token used. |

**Email service** (`app/services/email_service.py`):
- Plain-text email via `smtplib` (stdlib, no new dependency)
- Config via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Reset link format: `{FRONTEND_URL}/reset-password?token={raw_token}`
- 1-hour expiry stated in email body

**New Pydantic schemas**:
- `ForgotPasswordRequest` — `email: str`
- `ResetPasswordRequest` — `token: str`, `new_password: str`

### Frontend

**New pages:**

`frontend/app/forgot-password/page.tsx`
- Single email field
- On submit: call `POST /auth/forgot-password`, then show static confirmation: "If that email is registered, a reset link has been sent. Check your inbox."
- No indication of whether email exists (matches backend behaviour)
- Link back to login

`frontend/app/reset-password/page.tsx`
- Reads `?token=` from URL query params
- Fields: New Password, Confirm New Password (zod validation, min 8 chars)
- On success: show "Password updated. Redirecting to login..." then `router.push('/login')` after 2 seconds
- On error (expired/invalid token): show clear error with link to request a new reset

**Login page update** (`frontend/app/login/page.tsx`):
- Add "Forgot your password?" link below the password field, pointing to `/forgot-password`

**API client** (`frontend/lib/api.ts`):
- `authApi.forgotPassword(email)`
- `authApi.resetPassword(token, newPassword)`

### Environment Variables

Add to `.env` and document in `docs/deployment.md`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

### Security Notes

- Raw token is a 32-byte `secrets.token_urlsafe()` value; only the SHA-256 hash is stored in the DB
- Endpoint always returns 200 to prevent email enumeration
- Tokens expire after 1 hour and are single-use
- Old unused tokens for the same user are invalidated when a new request is made

### Files Changed

**Backend:**
- `app/models/password_reset_token.py` — new model
- `app/models/__init__.py` — register model
- `app/schemas/auth.py` — add ForgotPasswordRequest, ResetPasswordRequest
- `app/services/email_service.py` — new email service
- `app/routers/auth.py` — add forgot-password and reset-password endpoints
- `app/core/migrations.py` — add password_reset_tokens table migration
- `requirements.txt` — no new dependencies (smtplib is stdlib)

**Frontend:**
- `frontend/app/forgot-password/page.tsx` — new page
- `frontend/app/reset-password/page.tsx` — new page
- `frontend/app/login/page.tsx` — add "Forgot password?" link
- `frontend/lib/api.ts` — add forgotPassword and resetPassword methods

---

## Deferred to Post-v1

- **Trip Templates** (feature 019) — not started; explicitly deferred
- **Forgot password HTML email template** — plain text is sufficient for v1
- **Token cleanup job** — expired tokens accumulate in DB; a cron to purge them can be added post-v1
