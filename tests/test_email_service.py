# tests/test_email_service.py
"""Tests for the Brevo email service."""
import importlib
import os
from unittest.mock import MagicMock, patch

import pytest

from app.core import email_config


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
        """send_password_reset_email calls Brevo transactional_emails with correct params."""
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_PASSWORD_RESET": "42",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                MockBrevo.return_value = mock_client

                from app.services import email_service

                importlib.reload(email_config)
                importlib.reload(email_service)
                from app.services.email_service import send_password_reset_email

                send_password_reset_email(
                    "user@example.com",
                    "http://localhost:3000/reset-password?token=xyz",
                )

                MockBrevo.assert_called_once_with(api_key="test-api-key")
                mock_client.transactional_emails.send_transac_email.assert_called_once()
                kwargs = (
                    mock_client.transactional_emails.send_transac_email.call_args.kwargs
                )
                assert kwargs["template_id"] == 42
                assert (
                    kwargs["params"]["RESET_LINK"]
                    == "http://localhost:3000/reset-password?token=xyz"
                )
                assert kwargs["to"][0].email == "user@example.com"

    def test_logs_and_raises_on_api_error(self):
        """ApiError is logged and re-raised."""
        from brevo.core.api_error import ApiError

        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_PASSWORD_RESET": "42",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                mock_client.transactional_emails.send_transac_email.side_effect = (
                    ApiError(body={"message": "Unauthorized"})
                )
                MockBrevo.return_value = mock_client

                from app.services import email_service

                importlib.reload(email_config)
                importlib.reload(email_service)
                from app.services.email_service import send_password_reset_email

                with pytest.raises(ApiError):
                    send_password_reset_email(
                        "user@example.com", "http://example.com/reset"
                    )


class TestSendTripShareEmail:
    def test_skips_when_api_key_not_set(self, caplog):
        """Trip share email is skipped gracefully when BREVO_API_KEY is not configured."""
        env_backup = os.environ.copy()
        os.environ.pop("BREVO_API_KEY", None)
        try:
            from app.services import email_service

            importlib.reload(email_service)
            from app.services.email_service import send_trip_share_email

            send_trip_share_email(
                "recipient@example.com",
                trip_name="Portugal 2026",
                shared_by="owner@example.com",
                trip_url="http://localhost:3000/trips/1",
            )
        finally:
            os.environ.clear()
            os.environ.update(env_backup)

        assert any("BREVO_API_KEY" in r.message for r in caplog.records)

    def test_calls_brevo_with_correct_params(self):
        """send_trip_share_email calls Brevo with TRIP_NAME, SHARED_BY, TRIP_URL."""
        env = {
            "BREVO_API_KEY": "test-api-key",
            "BREVO_SENDER_EMAIL": "noreply@example.com",
            "BREVO_SENDER_NAME": "Travel Planner",
            "BREVO_TEMPLATE_TRIP_SHARE": "10",
        }
        with patch.dict(os.environ, env):
            with patch("brevo.Brevo") as MockBrevo:
                mock_client = MagicMock()
                MockBrevo.return_value = mock_client

                from app.services import email_service

                importlib.reload(email_config)
                importlib.reload(email_service)
                from app.services.email_service import send_trip_share_email

                send_trip_share_email(
                    "recipient@example.com",
                    trip_name="Portugal 2026",
                    shared_by="owner@example.com",
                    trip_url="http://localhost:3000/trips/1",
                )

                mock_client.transactional_emails.send_transac_email.assert_called_once()
                kwargs = (
                    mock_client.transactional_emails.send_transac_email.call_args.kwargs
                )
                assert kwargs["template_id"] == 10
                assert kwargs["params"]["TRIP_NAME"] == "Portugal 2026"
                assert kwargs["params"]["SHARED_BY"] == "owner@example.com"
                assert kwargs["params"]["TRIP_URL"] == "http://localhost:3000/trips/1"
                assert kwargs["to"][0].email == "recipient@example.com"
