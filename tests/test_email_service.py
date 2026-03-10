# tests/test_email_service.py
"""Tests for the Brevo email service."""
import importlib
import os
from unittest.mock import MagicMock, patch

import pytest


class TestSendPasswordResetEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        """Email is skipped gracefully when BREVO_API_KEY is not configured."""
        env_backup = os.environ.copy()
        os.environ.pop("BREVO_API_KEY", None)
        try:
            from app.services import email_service

            importlib.reload(email_service)
            from app.services.email_service import send_password_reset_email

            # Should not raise
            send_password_reset_email(
                "user@example.com",
                "http://localhost:3000/reset-password?token=abc",
            )
        finally:
            os.environ.clear()
            os.environ.update(env_backup)

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
            with patch("brevo_python.TransactionalEmailsApi") as MockApi:
                mock_instance = MagicMock()
                MockApi.return_value = mock_instance

                from app.services import email_service

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
                assert (
                    "http://localhost:3000/reset-password?token=xyz"
                    in call_args.params["RESET_LINK"]
                )

    def test_logs_and_raises_on_api_exception(self):
        """ApiException is logged and re-raised."""
        from brevo_python.rest import ApiException

        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_PASSWORD_RESET": "42",
        }
        with patch.dict(os.environ, env):
            with patch("brevo_python.TransactionalEmailsApi") as MockApi:
                mock_instance = MagicMock()
                mock_instance.send_transac_email.side_effect = ApiException(
                    status=401, reason="Unauthorized"
                )
                MockApi.return_value = mock_instance

                from app.services import email_service

                importlib.reload(email_service)
                from app.services.email_service import send_password_reset_email

                with pytest.raises(ApiException):
                    send_password_reset_email(
                        "user@example.com", "http://example.com/reset"
                    )
