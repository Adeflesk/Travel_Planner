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


def send_trip_share_email(
    to_email: str,
    trip_name: str,
    shared_by: str,
    trip_url: str,
) -> None:
    """
    Notify a user that a trip has been shared with them.

    Silently skips if BREVO_API_KEY is not configured.
    Raises ApiError on Brevo API errors (caller swallows).
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping trip share email to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_TRIP_SHARE,
            params={
                "TRIP_NAME": trip_name,
                "SHARED_BY": shared_by,
                "TRIP_URL": trip_url,
            },
            sender=_sender(),
        )
        logger.info("Trip share email sent to %s for trip '%s'", to_email, trip_name)
    except ApiError as e:
        logger.error("Brevo API error sending trip share to %s: %s", to_email, e)
        raise


def send_accommodation_reminder_email(
    to_email: str,
    accommodation_name: str,
    cancel_by_date: str,
    trip_name: str,
) -> None:
    """
    Remind a user their free cancellation window is closing.

    APP_URL is sourced from email_config.FRONTEND_URL internally.
    Silently skips if BREVO_API_KEY is not configured.
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping accommodation reminder to %s", to_email
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_ACCOMMODATION_REMINDER,
            params={
                "ACCOMMODATION_NAME": accommodation_name,
                "CANCEL_BY_DATE": cancel_by_date,
                "TRIP_NAME": trip_name,
                "APP_URL": email_config.FRONTEND_URL,
            },
            sender=_sender(),
        )
        logger.info(
            "Accommodation reminder sent to %s for '%s'", to_email, accommodation_name
        )
    except ApiError as e:
        logger.error(
            "Brevo API error sending accommodation reminder to %s: %s", to_email, e
        )
        raise


def send_transport_booking_reminder_email(
    to_email: str,
    transport_type: str,
    origin: str,
    destination: str,
    departure_date: str,
    trip_name: str,
) -> None:
    """
    Notify a user that booking is now open for an unbooked transport leg.

    APP_URL is sourced from email_config.FRONTEND_URL internally.
    Silently skips if BREVO_API_KEY is not configured.
    """
    if not email_config.BREVO_API_KEY:
        logger.warning(
            "BREVO_API_KEY not set — skipping transport booking reminder to %s",
            to_email,
        )
        return

    client = _make_client()
    try:
        client.transactional_emails.send_transac_email(
            to=[SendTransacEmailRequestToItem(email=to_email)],
            template_id=email_config.TEMPLATE_TRANSPORT_BOOKING_REMINDER,
            params={
                "TRANSPORT_TYPE": transport_type,
                "ORIGIN": origin,
                "DESTINATION": destination,
                "DEPARTURE_DATE": departure_date,
                "TRIP_NAME": trip_name,
                "APP_URL": email_config.FRONTEND_URL,
            },
            sender=_sender(),
        )
        logger.info(
            "Transport booking reminder sent to %s for %s → %s",
            to_email,
            origin,
            destination,
        )
    except ApiError as e:
        logger.error(
            "Brevo API error sending transport reminder to %s: %s", to_email, e
        )
        raise
