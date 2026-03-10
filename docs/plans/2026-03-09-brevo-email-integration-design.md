# Brevo Email Integration Design

**Date:** 2026-03-09
**Status:** Approved
**Scope:** Replace smtplib email plan with Brevo Python SDK; implement forgot-password email; lay groundwork for future booking reminder emails.

---

## Context

The v1 completion plan (`2026-03-07-v1-completion-design.md`) designed a forgot-password flow using Python's `smtplib` with generic SMTP env vars. This design supersedes that email service with the Brevo transactional email SDK — better suited for multiple email types (password reset, future booking reminders), template management in the Brevo dashboard, and deliverability tracking.

---

## Brevo Account Setup (one-time)

Steps to include in the implementation plan:

1. Create a free account at brevo.com (free tier: 300 emails/day)
2. Verify a sender address or domain: **Settings → Senders & Domains**
3. Generate an API key: **Settings → API Keys → Create a new API key** (name it "Travel Planner")
4. Create a **Password Reset** email template:
   - Subject: `Reset your Travel Planner password`
   - Body includes `{{ params.RESET_LINK }}` and `{{ params.EXPIRY }}` template variables
   - Note the integer template ID shown in the Brevo dashboard
5. Record the template ID — it becomes the `BREVO_TEMPLATE_PASSWORD_RESET` env var

---

## Architecture

### Approach

Thin function wrapper (Option A): a flat `email_service.py` module with one typed function per email type. Each function calls Brevo's transactional email API using the `brevo-python` SDK. Adding a new email type (e.g. booking reminder) means adding a new function — no class restructure needed.

### New Dependency

```
brevo-python
```

Added to `requirements.txt`.

### `app/services/email_service.py`

```python
"""
Email service using Brevo transactional email API.

Required env vars:
  BREVO_API_KEY                     - API key from Brevo dashboard
  BREVO_SENDER_EMAIL                - Verified sender address
  BREVO_SENDER_NAME                 - Display name (e.g. "Travel Planner")
  BREVO_TEMPLATE_PASSWORD_RESET     - Integer template ID for password reset email

If BREVO_API_KEY is not set, all send functions log a warning and return
without sending — allows local dev without email configured.
"""
```

**Public interface:**

```python
def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """Send password reset email via Brevo template."""

# Future (not implemented in this PR):
# def send_booking_reminder_email(to_email: str, booking: ...) -> None:
```

**Graceful degradation:** if `BREVO_API_KEY` is unset, the function logs a warning and returns — no crash, no email.

**Error handling:** Brevo's `ApiException` is caught, logged, and re-raised. The forgot-password router swallows re-raises at the endpoint level (always returns 200) so email failures are never exposed to the client.

---

## Router Integration

`app/routers/auth.py` — `forgot_password` endpoint:

- Token creation logic unchanged from v1 plan
- Replace `send_email(...)` call with `send_password_reset_email(user.email, reset_link)`
- `reset_password` endpoint unaffected

---

## Environment Variables

All secrets set on **Fly.io** via `fly secrets set`. No Vercel changes needed. `FRONTEND_URL` (already set) provides the base URL for the reset link.

Replaces the old `SMTP_*` vars in `docs/deployment.md`:

| Variable | Required | Description |
|---|---|---|
| `BREVO_API_KEY` | Yes* | API key from Brevo dashboard |
| `BREVO_SENDER_EMAIL` | Yes* | Verified sender address |
| `BREVO_SENDER_NAME` | No | Display name; defaults to "Travel Planner" |
| `BREVO_TEMPLATE_PASSWORD_RESET` | Yes* | Integer template ID for password reset email |

*Required for password reset emails to send. App runs without them (emails silently skipped).

---

## Testing

- `send_password_reset_email` is mocked with `unittest.mock.patch` in `tests/test_auth.py` — no real emails sent in CI
- Mock asserts called with correct email and a link containing `/reset-password?token=`
- Brevo `ApiException` tested by mock raising it — verifies forgot-password endpoint still returns 200

---

## Files Changed

| File | Change |
|---|---|
| `requirements.txt` | Add `brevo-python` |
| `app/services/email_service.py` | New — Brevo SDK wrapper with `send_password_reset_email` |
| `app/routers/auth.py` | Import and call `send_password_reset_email`; add forgot/reset endpoints |
| `app/models/password_reset_token.py` | New — PasswordResetToken model (from v1 plan) |
| `app/models/__init__.py` | Register PasswordResetToken |
| `app/schemas/auth.py` | Add ForgotPasswordRequest, ResetPasswordRequest |
| `app/core/migrations.py` | Add password_reset_tokens table migration |
| `tests/test_auth.py` | Mock email service; add forgot/reset endpoint tests |
| `docs/deployment.md` | Replace SMTP_* vars with Brevo vars |
| `.env.example` | Add Brevo env var placeholders |

---

## Deferred

- Booking reminder emails (`send_booking_reminder_email`) — service is designed to accept it, not implemented
- HTML email template styling beyond Brevo's default
- Cron job to purge expired `password_reset_tokens`
