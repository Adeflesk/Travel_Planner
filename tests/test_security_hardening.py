import importlib
import inspect
import re

import pytest


def test_secret_key_required_in_production(monkeypatch):
    """SECRET_KEY must not use the weak default when ENVIRONMENT=production."""
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    import app.core.security as sec_module

    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        importlib.reload(sec_module)


def test_secret_key_allows_default_in_dev(monkeypatch):
    """In non-production, a default key is acceptable for local dev."""
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.core.security as sec_module

    importlib.reload(sec_module)
    assert sec_module.SECRET_KEY == "dev-secret-key-change-in-production"


def test_trip_summary_query_uses_parameterized_sql():
    """The trip summary query must use bind parameters, not f-string interpolation."""
    from app.routers.trips import get_trips

    source = inspect.getsource(get_trips)
    # The old vulnerable pattern: f-string with IN ({ids_csv})
    assert (
        'f"' not in source or "ids_csv" not in source
    ), "get_trips still uses f-string SQL interpolation — use bindparam(expanding=True)"
    # The safe pattern should use :ids bind parameter
    assert (
        "expanding=True" in source or ":ids" in source
    ), "get_trips should use bindparam with expanding=True for the IN clause"


def test_cors_regex_is_scoped_to_project():
    """CORS regex must not match arbitrary *.vercel.app domains."""
    from app.main import create_app

    app = create_app()
    cors_middleware = None
    for middleware in app.user_middleware:
        if middleware.cls.__name__ == "CORSMiddleware":
            cors_middleware = middleware
            break

    assert cors_middleware is not None, "CORSMiddleware not found"
    regex = cors_middleware.kwargs.get("allow_origin_regex", "")

    assert not re.match(
        regex, "https://evil-attacker.vercel.app"
    ), f"CORS regex '{regex}' matches arbitrary vercel.app subdomains"
    assert re.match(
        regex, "https://travel-planner-one-abc123-someuser.vercel.app"
    ), f"CORS regex '{regex}' should match travel-planner preview deploys"
