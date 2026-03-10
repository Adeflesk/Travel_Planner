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

import brevo_python
from brevo_python.rest import ApiException

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

    configuration = brevo_python.Configuration()
    configuration.api_key["api-key"] = api_key

    api_instance = brevo_python.TransactionalEmailsApi(
        brevo_python.ApiClient(configuration)
    )

    email = brevo_python.SendSmtpEmail(
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
