"""
app/routers/exchange_rates.py - Exchange rate endpoints
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.exchange_rate import get_rates

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])


@router.get("/", response_model=dict[str, float])
def fetch_exchange_rates(base: str = Query(default="USD", min_length=3, max_length=3)):
    """
    Return live exchange rates relative to *base* currency (default USD).

    Rates are cached for 1 hour.  Returns 503 if the upstream API is
    unreachable and no stale data is available.
    """
    rates = get_rates(base)
    if rates is None:
        raise HTTPException(
            status_code=503,
            detail=f"Exchange rates unavailable for base currency '{base}'.",
        )
    return rates
