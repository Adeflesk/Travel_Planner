import importlib
import inspect
import re

import pytest
from fastapi.testclient import TestClient


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


def test_security_headers_present():
    """All responses must include standard security headers."""
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_admin_reset_password_uses_pydantic_schema():
    """Admin password reset must accept a Pydantic body, not a bare string."""
    from app.routers.admin import reset_user_password

    sig = inspect.signature(reset_user_password)
    params = sig.parameters

    assert (
        "new_password" not in params
    ), "reset_user_password should accept a Pydantic body schema, not a bare new_password param"
    body_params = [
        name for name, p in params.items() if name not in ("user_id", "db", "admin")
    ]
    assert (
        len(body_params) >= 1
    ), "reset_user_password should have a Pydantic body parameter"


def test_admin_list_users_has_limit_upper_bound():
    """The admin user list endpoint must enforce an upper bound on 'limit'."""
    from app.main import app

    openapi = app.openapi()
    paths = openapi.get("paths", {})
    admin_users = paths.get("/admin/users/", {}).get("get", {})
    params = admin_users.get("parameters", [])

    limit_param = next((p for p in params if p.get("name") == "limit"), None)
    assert limit_param is not None, "limit parameter not found in OpenAPI schema"

    schema = limit_param.get("schema", {})
    assert (
        "maximum" in schema or "exclusiveMaximum" in schema
    ), f"limit parameter has no upper bound: {schema}"
    assert (
        schema.get("maximum", float("inf")) <= 1000
    ), f"limit upper bound is too high: {schema.get('maximum')}"


def test_frontend_url_required_in_production(monkeypatch):
    """FRONTEND_URL must be set in production."""
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")

    import app.core.email_config as email_module

    with pytest.raises(ValueError, match="FRONTEND_URL"):
        importlib.reload(email_module)


def test_frontend_url_defaults_in_dev(monkeypatch):
    """FRONTEND_URL can default to localhost in development."""
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.core.email_config as email_module

    importlib.reload(email_module)
    assert email_module.FRONTEND_URL == "http://localhost:3000"


def test_get_trip_or_404_checks_permission_field():
    """get_trip_or_404 should reference share.permission in its access check."""
    from app.routers.trips import get_trip_or_404

    source = inspect.getsource(get_trip_or_404)
    assert (
        "share.permission" in source or "permission" in source
    ), "get_trip_or_404 does not check the permission field on TripShare"
