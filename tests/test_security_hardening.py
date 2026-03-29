import importlib
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
