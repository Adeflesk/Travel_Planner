"""
app/services/exchange_rate.py - Exchange rate fetching service

Fetches live exchange rates from the Open Exchange Rates API (no key required)
and caches them in memory with a 1-hour TTL so repeated calls within the same
hour hit the cache rather than the upstream API.

Returns None on any failure — callers must handle a missing rates dict
gracefully and never block business logic on exchange rate availability.
"""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = "https://open.er-api.com/v6/latest/{base}"
_TTL_SECONDS = 3600  # 1 hour

# In-memory cache: { base_currency -> (fetched_at, rates_dict) }
_cache: dict[str, tuple[float, dict[str, float]]] = {}


def get_rates(base: str = "USD") -> dict[str, float] | None:
    """
    Return exchange rates relative to *base* currency.

    Uses a 1-hour in-memory cache.  Returns None on any network or parse
    failure — callers should fall back gracefully.
    """
    base = base.upper().strip()
    if not base:
        return None

    cached = _cache.get(base)
    if cached is not None:
        fetched_at, rates = cached
        if time.monotonic() - fetched_at < _TTL_SECONDS:
            return rates

    try:
        response = httpx.get(_BASE_URL.format(base=base), timeout=5.0)
        if response.status_code != 200:
            logger.warning(
                "Exchange rate API returned %d for base %s",
                response.status_code,
                base,
            )
            return _stale_fallback(base)

        data = response.json()
        if data.get("result") != "success":
            logger.warning("Exchange rate API returned non-success for base %s", base)
            return _stale_fallback(base)

        rates: dict[str, float] = data.get("rates", {})
        if not rates:
            return _stale_fallback(base)

        _cache[base] = (time.monotonic(), rates)
        return rates

    except Exception as exc:
        logger.warning("Exchange rate fetch failed for base %s: %s", base, exc)
        return _stale_fallback(base)


def _stale_fallback(base: str) -> dict[str, float] | None:
    """Return stale cached data if available, otherwise None."""
    cached = _cache.get(base)
    if cached is not None:
        logger.info("Returning stale exchange rates for base %s", base)
        return cached[1]
    return None


# Static country → currency lookup. Covers the most common travel destinations.
_COUNTRY_CURRENCY: dict[str, str] = {
    "united states": "USD",
    "canada": "CAD",
    "united kingdom": "GBP",
    "japan": "JPY",
    "china": "CNY",
    "australia": "AUD",
    "new zealand": "NZD",
    "switzerland": "CHF",
    "india": "INR",
    "brazil": "BRL",
    "mexico": "MXN",
    "south korea": "KRW",
    "singapore": "SGD",
    "hong kong": "HKD",
    "thailand": "THB",
    "vietnam": "VND",
    "indonesia": "IDR",
    "malaysia": "MYR",
    "philippines": "PHP",
    "taiwan": "TWD",
    "south africa": "ZAR",
    "turkey": "TRY",
    "russia": "RUB",
    "egypt": "EGP",
    "morocco": "MAD",
    "colombia": "COP",
    "argentina": "ARS",
    "chile": "CLP",
    "peru": "PEN",
    "israel": "ILS",
    "united arab emirates": "AED",
    "saudi arabia": "SAR",
    "norway": "NOK",
    "sweden": "SEK",
    "denmark": "DKK",
    "iceland": "ISK",
    "czech republic": "CZK",
    "czechia": "CZK",
    "poland": "PLN",
    "hungary": "HUF",
    "romania": "RON",
    "croatia": "EUR",
    # Eurozone countries
    "france": "EUR",
    "germany": "EUR",
    "italy": "EUR",
    "spain": "EUR",
    "portugal": "EUR",
    "netherlands": "EUR",
    "belgium": "EUR",
    "austria": "EUR",
    "ireland": "EUR",
    "greece": "EUR",
    "finland": "EUR",
    "estonia": "EUR",
    "latvia": "EUR",
    "lithuania": "EUR",
    "slovakia": "EUR",
    "slovenia": "EUR",
    "luxembourg": "EUR",
    "malta": "EUR",
    "cyprus": "EUR",
}


def infer_base_currency(country: str | None) -> str:
    """
    Map a country name to its ISO 4217 currency code.

    Returns "USD" if the country is unknown, empty, or None.
    """
    if not country:
        return "USD"
    return _COUNTRY_CURRENCY.get(country.strip().lower(), "USD")


def invalidate_cache(base: str | None = None) -> None:
    """
    Invalidate the cache for *base* (or all bases if None).
    Primarily useful in tests.
    """
    if base is None:
        _cache.clear()
    else:
        _cache.pop(base.upper(), None)


def record_rate_snapshots(
    base: str,
    rates: dict[str, float],
    target_currencies: list[str],
) -> None:
    """
    Record rate snapshots after a cache refresh.

    Creates its own DB session so it can be called from the exchange rate
    service without threading a session through get_rates().
    """
    if not target_currencies:
        return
    try:
        from database import SessionLocal
        from app.services.rate_snapshot_service import record_snapshots

        db = SessionLocal()
        try:
            record_snapshots(db, base, rates, target_currencies)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Failed to record rate snapshots: %s", exc)


def convert(amount, from_currency: str, to_currency: str) -> tuple | None:
    """
    Convert *amount* from one currency to another.

    Returns ``(exchange_rate, base_amount)`` or ``None`` if rates are
    unavailable.  ``base_amount`` is quantized to 2 decimal places.
    """
    from decimal import Decimal, ROUND_HALF_UP

    from_currency = from_currency.upper().strip()
    to_currency = to_currency.upper().strip()

    if from_currency == to_currency:
        return Decimal("1.0"), amount

    rates = get_rates(from_currency)
    if rates is None:
        return None

    rate_float = rates.get(to_currency)
    if rate_float is None:
        return None

    rate = Decimal(str(rate_float))
    base_amount = (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return rate, base_amount
