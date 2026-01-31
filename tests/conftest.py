import os
import sys

import pytest

# Disable rate limiting for tests
os.environ["RATE_LIMIT_ENABLED"] = "false"

# Ensure project root is on sys.path for test imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.security import create_access_token, get_password_hash  # noqa: E402
from database import get_db  # noqa: E402
from main import app  # noqa: E402
from models import Base, User  # noqa: E402


# Shared test DB configuration (matches existing tests)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    return engine


@pytest.fixture(scope="session")
def testing_session_local():
    return TestingSessionLocal


@pytest.fixture(scope="session")
def base_client(testing_session_local):
    """TestClient with `get_db` dependency overridden to use testing session."""

    def _override_get_db():
        try:
            db = testing_session_local()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    test_client = TestClient(app)
    yield test_client
    test_client.close()


@pytest.fixture(scope="function")
def db_setup(db_engine, testing_session_local):
    """Create and drop schema around each test when used."""
    Base.metadata.create_all(bind=db_engine)
    yield
    Base.metadata.drop_all(bind=db_engine)


@pytest.fixture(scope="function")
def test_db(db_setup):
    """Compatibility alias for existing tests that expect `test_db`."""
    yield


@pytest.fixture(scope="function")
def test_user(db_setup, testing_session_local):
    """Create a test user and return user data with auth token."""
    db = testing_session_local()
    try:
        # Create test user
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("testpassword123"),
            full_name="Test User",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Generate access token
        token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "role": user.role.value,
            }
        )

        yield {
            "user": user,
            "token": token,
            "headers": {"Authorization": f"Bearer {token}"},
        }
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(base_client, test_user):
    """
    Authenticated test client.

    Returns a client wrapper that automatically includes auth headers.
    """

    class AuthenticatedClient:
        def __init__(self, client, headers):
            self._client = client
            self._headers = headers

        def get(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.get(url, **kwargs)

        def post(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.post(url, **kwargs)

        def put(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.put(url, **kwargs)

        def patch(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.patch(url, **kwargs)

        def delete(self, url, **kwargs):
            kwargs.setdefault("headers", {}).update(self._headers)
            return self._client.delete(url, **kwargs)

    return AuthenticatedClient(base_client, test_user["headers"])


@pytest.fixture(scope="function")
def unauthenticated_client(base_client):
    """Return unauthenticated client for testing auth-required endpoints."""
    return base_client
