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
        logger.warning(
            "SMTP_HOST not set — skipping email to %s (subject: %s)", to, subject
        )
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
