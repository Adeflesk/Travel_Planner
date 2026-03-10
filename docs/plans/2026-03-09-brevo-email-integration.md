# Brevo Email Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing smtplib `send_email` function with a Brevo SDK `send_password_reset_email` function, wiring it into the already-implemented forgot-password flow.

**Architecture:** Most of the forgot-password flow already exists (model, migration, schemas, endpoints, tests). The work is: add `brevo-python` dependency, rewrite `email_service.py` with the Brevo SDK, update the one call site in the router, add test mocks, and update deployment docs. No new backend routes or frontend changes needed.

**Tech Stack:** Python 3.13, FastAPI, `brevo-python` (Brevo transactional email SDK, module name `sib_api_v3_sdk`), pytest, `unittest.mock`

---

## Pre-requisite: Brevo Account Setup (manual steps — do before coding)

1. Go to [brevo.com](https://www.brevo.com) and create a free account (300 emails/day free tier)
2. Verify your sender address: **Settings → Senders & Domains → Add a sender** — add and confirm the email you'll send from
3. Create an API key: **Settings → API Keys → Generate a new API key** — name it "Travel Planner", copy the key
4. Create the password reset template: **Email → Templates → Create a template**
   - Name: `Password Reset`
   - Subject: `Reset your Travel Planner password`
   - Body (plain text or HTML):
     ```
     Hi,

     Click the link below to reset your Travel Planner password.
     This link expires in 1 hour.

     {{ params.RESET_LINK }}

     If you didn't request this, you can safely ignore this email.
     ```
   - Save and **activate** the template
   - Note the **integer Template ID** shown in the template list (e.g. `1`, `42`)
5. You now have: API key, sender email, template ID — these become env vars in Task 5

---

## Task 1: Add brevo-python to requirements.txt

**Files:**
- Modify: `requirements.txt`

**Step 1: Add the dependency**

In `requirements.txt`, add after the `# Core dependencies` block:

```
brevo-python==3.0.0
```

**Step 2: Install it**

```bash
source .venv/bin/activate
pip install brevo-python==3.0.0
```

Expected: installs without error. `pip show brevo-python` shows version 3.0.0.

**Step 3: Verify import works**

```bash
python -c "import sib_api_v3_sdk; print('OK')"
```

Expected: `OK`

**Step 4: Commit**

```bash
git add requirements.txt
git commit -m "feat: add brevo-python dependency for transactional email"
```

---

## Task 2: Write tests for the new email service

**Files:**
- Create: `tests/test_email_service.py`

**Step 1: Create the test file**

```python
# tests/test_email_service.py
"""Tests for the Brevo email service."""
import os
from unittest.mock import MagicMock, patch

import pytest


class TestSendPasswordResetEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        """Email is skipped gracefully when BREVO_API_KEY is not configured."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove BREVO_API_KEY if present
            os.environ.pop("BREVO_API_KEY", None)
            from app.services import email_service
            import importlib
            importlib.reload(email_service)
            from app.services.email_service import send_password_reset_email

            # Should not raise
            send_password_reset_email("user@example.com", "http://localhost:3000/reset-password?token=abc")

        assert any("BREVO_API_KEY" in r.message for r in caplog.records)

    def test_calls_brevo_api_with_correct_params(self):
        """send_password_reset_email calls Brevo TransactionalEmailsApi with correct template params."""
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_PASSWORD_RESET": "42",
        }
        with patch.dict(os.environ, env):
            with patch("sib_api_v3_sdk.TransactionalEmailsApi") as MockApi:
                mock_instance = MagicMock()
                MockApi.return_value = mock_instance

                from app.services import email_service
                import importlib
                importlib.reload(email_service)
                from app.services.email_service import send_password_reset_email

                send_password_reset_email(
                    "user@example.com",
                    "http://localhost:3000/reset-password?token=xyz",
                )

                mock_instance.send_transac_email.assert_called_once()
                call_args = mock_instance.send_transac_email.call_args[0][0]
                assert call_args.to[0]["email"] == "user@example.com"
                assert call_args.template_id == 42
                assert "http://localhost:3000/reset-password?token=xyz" in call_args.params["RESET_LINK"]

    def test_logs_and_raises_on_api_exception(self):
        """ApiException is logged and re-raised."""
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException

        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_PASSWORD_RESET": "42",
        }
        with patch.dict(os.environ, env):
            with patch("sib_api_v3_sdk.TransactionalEmailsApi") as MockApi:
                mock_instance = MagicMock()
                mock_instance.send_transac_email.side_effect = ApiException(status=401, reason="Unauthorized")
                MockApi.return_value = mock_instance

                from app.services import email_service
                import importlib
                importlib.reload(email_service)
                from app.services.email_service import send_password_reset_email

                with pytest.raises(ApiException):
                    send_password_reset_email("user@example.com", "http://example.com/reset")
```

**Step 2: Run tests to verify they fail**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py -v
```

Expected: FAIL — `send_password_reset_email` does not exist yet (ImportError or AttributeError).

**Step 3: Commit the failing tests**

```bash
git add tests/test_email_service.py
git commit -m "test: add failing tests for Brevo email service"
```

---

## Task 3: Implement the Brevo email service

**Files:**
- Modify: `app/services/email_service.py`

**Step 1: Replace the file contents**

Replace the entire contents of `app/services/email_service.py` with:

```python
"""
app/services/email_service.py - Transactional email via Brevo SDK.

Required env vars:
  BREVO_API_KEY                   - API key from Brevo dashboard
  BREVO_SENDER_EMAIL              - Verified sender address
  BREVO_SENDER_NAME               - Display name (defaults to "Travel Planner")
  BREVO_TEMPLATE_PASSWORD_RESET   - Integer template ID for password reset email

If BREVO_API_KEY is not set, send functions log a warning and return without
sending — allows the app to run locally without email configured.
"""
import logging
import os

import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Send a password reset email via Brevo transactional template.

    Silently skips if BREVO_API_KEY is not configured.
    Raises ApiException on Brevo API errors (caller handles suppression).
    """
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        logger.warning(
            "BREVO_API_KEY not set — skipping password reset email to %s", to_email
        )
        return

    template_id = int(os.getenv("BREVO_TEMPLATE_PASSWORD_RESET", "0"))
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "")
    sender_name = os.getenv("BREVO_SENDER_NAME", "Travel Planner")

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = api_key

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        template_id=template_id,
        params={"RESET_LINK": reset_link, "EXPIRY": "1 hour"},
        sender={"name": sender_name, "email": sender_email},
    )

    try:
        api_instance.send_transac_email(email)
        logger.info("Password reset email sent to %s", to_email)
    except ApiException as e:
        logger.error("Brevo API error sending to %s: %s", to_email, e)
        raise
```

**Step 2: Run the new tests**

```bash
source .venv/bin/activate
pytest tests/test_email_service.py -v
```

Expected: all 3 tests PASS.

**Step 3: Run full backend test suite to check nothing broke**

```bash
pytest -q --tb=short
```

Expected: all tests pass. (The existing `test_forgot_password_known_email_creates_token` test will still pass because SMTP_HOST is unset in CI — but it will now log a BREVO_API_KEY warning instead of an SMTP_HOST warning.)

**Step 4: Commit**

```bash
git add app/services/email_service.py
git commit -m "feat: implement Brevo email service with send_password_reset_email"
```

---

## Task 4: Update auth router to use send_password_reset_email

**Files:**
- Modify: `app/routers/auth.py:49,287-298`

**Step 1: Update the import**

In `app/routers/auth.py`, find line 49:

```python
from app.services.email_service import send_email
```

Replace with:

```python
from app.services.email_service import send_password_reset_email
```

**Step 2: Update the call site in forgot_password**

Find the `try/except` block in `forgot_password` (around line 286):

```python
    try:
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
    except Exception as e:
        logger.error("Failed to send password reset email: %s", e)
        # Still return 200 to prevent user enumeration
```

Replace with:

```python
    try:
        send_password_reset_email(user.email, reset_link)
    except Exception as e:
        logger.error("Failed to send password reset email: %s", e)
        # Still return 200 to prevent user enumeration
```

**Step 3: Run lint and type check**

```bash
source .venv/bin/activate
cd /path/to/project
flake8 app/routers/auth.py --max-line-length=100
```

Expected: no errors.

**Step 4: Run tests**

```bash
pytest tests/test_auth.py -v
```

Expected: all auth tests pass.

**Step 5: Commit**

```bash
git add app/routers/auth.py
git commit -m "feat: wire send_password_reset_email into forgot_password endpoint"
```

---

## Task 5: Add email mock to auth tests

**Files:**
- Modify: `tests/test_auth.py`

The `test_forgot_password_known_email_creates_token` test currently works because `BREVO_API_KEY` is unset (email is silently skipped). Add an explicit mock to make the intent clear and future-proof the test against env changes.

**Step 1: Add mock to the forgot_password test**

Find `test_forgot_password_known_email_creates_token` in `tests/test_auth.py`. Add the `@patch` decorator and `mock_send` parameter:

```python
from unittest.mock import patch

# ...

@patch("app.routers.auth.send_password_reset_email")
def test_forgot_password_known_email_creates_token(self, mock_send, client):
    """Forgot password creates a reset token and calls the email service."""
    client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "password123"},
    )
    response = client.post(
        "/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    assert response.status_code == 200

    # Verify a token was actually created in the DB
    from app.models.password_reset_token import PasswordResetToken
    from app.models import User

    db = next(override_get_db())
    user = db.query(User).filter(User.email == "user@example.com").first()
    token_count = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,  # noqa: E712
        )
        .count()
    )
    db.close()
    assert token_count == 1

    # Verify email service was called with the user's email
    mock_send.assert_called_once()
    call_email = mock_send.call_args[0][0]
    assert call_email == "user@example.com"
```

Also add a test that verifies the endpoint returns 200 even when the email service raises:

```python
@patch("app.routers.auth.send_password_reset_email", side_effect=Exception("Brevo down"))
def test_forgot_password_returns_200_when_email_fails(self, mock_send, client):
    """Forgot password returns 200 even if the email service raises an exception."""
    client.post(
        "/auth/register",
        json={"email": "user@example.com", "password": "password123"},
    )
    response = client.post(
        "/auth/forgot-password",
        json={"email": "user@example.com"},
    )
    assert response.status_code == 200
    assert "reset link" in response.json()["message"]
```

**Step 2: Run auth tests**

```bash
source .venv/bin/activate
pytest tests/test_auth.py -v
```

Expected: all tests pass including the two updated/new tests.

**Step 3: Run full test suite**

```bash
pytest -q --tb=short
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add tests/test_auth.py
git commit -m "test: mock send_password_reset_email in auth tests"
```

---

## Task 6: Update deployment documentation

**Files:**
- Modify: `docs/deployment.md:176-180`

**Step 1: Replace SMTP vars with Brevo vars**

Find these 5 lines in `docs/deployment.md`:

```markdown
| `SMTP_HOST` | No* | SMTP server hostname (e.g. smtp.gmail.com). Required for password reset emails. |
| `SMTP_PORT` | No | SMTP port. Defaults to 587. |
| `SMTP_USER` | No* | SMTP username / email. Required for password reset emails. |
| `SMTP_PASS` | No* | SMTP password or app password. Required for password reset emails. |
| `SMTP_FROM` | No | From address for outbound emails. Defaults to SMTP_USER. |
```

Replace with:

```markdown
| `BREVO_API_KEY` | No* | Brevo API key. Required for password reset emails. |
| `BREVO_SENDER_EMAIL` | No* | Verified sender email address. Required for password reset emails. |
| `BREVO_SENDER_NAME` | No | Display name for outbound emails. Defaults to "Travel Planner". |
| `BREVO_TEMPLATE_PASSWORD_RESET` | No* | Integer template ID from Brevo dashboard. Required for password reset emails. |
```

**Step 2: Set secrets on Fly.io (production)**

```bash
fly secrets set BREVO_API_KEY=your-api-key-here
fly secrets set BREVO_SENDER_EMAIL=noreply@yourdomain.com
fly secrets set BREVO_SENDER_NAME="Travel Planner"
fly secrets set BREVO_TEMPLATE_PASSWORD_RESET=42
```

(Replace values with your actual Brevo credentials from the pre-requisite setup.)

**Step 3: Verify secrets are set**

```bash
fly secrets list
```

Expected: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_TEMPLATE_PASSWORD_RESET` all listed.

**Step 4: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: replace SMTP vars with Brevo vars in deployment guide"
```

---

## Task 7: Smoke test end-to-end

**Step 1: Start both servers locally**

```bash
# Terminal 1
source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

**Step 2: Test without Brevo configured (local dev)**

- Go to `http://localhost:3000/login`
- Click "Forgot your password?"
- Enter any registered email, submit
- Confirm: page shows "If that email is registered, a reset link has been sent."
- Confirm: backend logs show `BREVO_API_KEY not set — skipping password reset email to ...`

**Step 3: Test with Brevo configured (optional, requires credentials)**

Set env vars in `.env`:
```env
BREVO_API_KEY=your-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Travel Planner
BREVO_TEMPLATE_PASSWORD_RESET=42
```

Restart backend, repeat step 2. Check inbox for reset email with working link.

**Step 4: Final full test run**

```bash
source .venv/bin/activate
pytest -q --tb=short
cd frontend && npm run lint && npx tsc --noEmit
```

Expected: all pass.

---

## Summary

| Task | Files | Commit message |
|------|-------|----------------|
| 1 | `requirements.txt` | `feat: add brevo-python dependency` |
| 2 | `tests/test_email_service.py` | `test: add failing tests for Brevo email service` |
| 3 | `app/services/email_service.py` | `feat: implement Brevo email service` |
| 4 | `app/routers/auth.py` | `feat: wire send_password_reset_email into forgot_password` |
| 5 | `tests/test_auth.py` | `test: mock send_password_reset_email in auth tests` |
| 6 | `docs/deployment.md` | `docs: replace SMTP vars with Brevo vars` |
