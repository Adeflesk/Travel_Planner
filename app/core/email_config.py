# app/core/email_config.py
"""
Centralised Brevo configuration.

All email service functions import from here.
If BREVO_API_KEY is not set, send functions log a warning and skip silently.

Env vars are read at module level, so load_dotenv() must run before this
module is first imported. We call it here as a safety net in case this
module is imported before app/main.py runs its own load_dotenv().
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Travel Planner")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

TEMPLATE_PASSWORD_RESET = int(os.getenv("BREVO_TEMPLATE_PASSWORD_RESET", "0"))
TEMPLATE_TRIP_SHARE = int(os.getenv("BREVO_TEMPLATE_TRIP_SHARE", "0"))
TEMPLATE_ACCOMMODATION_REMINDER = int(
    os.getenv("BREVO_TEMPLATE_ACCOMMODATION_REMINDER", "0")
)
TEMPLATE_TRANSPORT_BOOKING_REMINDER = int(
    os.getenv("BREVO_TEMPLATE_TRANSPORT_BOOKING_REMINDER", "0")
)
