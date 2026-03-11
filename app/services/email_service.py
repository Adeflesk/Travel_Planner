"""
app/services/email_service.py - Transactional email via Brevo SDK (v4).

Config is centralised in app.core.email_config.
If BREVO_API_KEY is not set, send functions log a warning and return without sending.
"""
import logging

from brevo import Brevo
from brevo.core.api_error import ApiError
from brevo.transactional_emails.types import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from app.core import email_config

logger = logging.getLogger(__name__)


def _make_client() -> Brevo:
    return Brevo(api_key=email_config.BREVO_API_KEY)


def _sender() -> SendTransacEmailRequestSender:
    return SendTransacEmailRequestSender(
        name=email_config.BREVO_SENDER_NAME,
        email=email_config.BREVO_SENDER_EMAIL,
    )


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Send a password reset email via Brevo transactional template.

    Silently skips if BREVO_API_KEY is not configured.
    Raises ApiError on Brevo API errors (caller handles suppression).
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping password reset email to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_PASSWORD_RESET,
            params={"RESET_LINK": reset_link, "EXPIRY": "1 hour"},
            sender=_sender(),
        )
        logger.info("Password reset email sent to %s", to_email)
    except ApiError as e:
        logger.error("Brevo API error sending to %s: %s", to_email, e)
        raise
