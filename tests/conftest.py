import pytest
import sys
import os

# Ensure project root is on sys.path for test imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import get_db
from models import Base


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
def client(testing_session_local):
    """TestClient with `get_db` dependency overridden to use testing session."""

    def _override_get_db():
        try:
            db = testing_session_local()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    client = TestClient(app)
    yield client
    client.close()


@pytest.fixture(scope="function")
def db_setup(db_engine):
    """Create and drop schema around each test when used."""
    Base.metadata.create_all(bind=db_engine)
    yield
    Base.metadata.drop_all(bind=db_engine)


@pytest.fixture(scope="function")
def test_db(db_setup):
    """Compatibility alias for existing tests that expect `test_db`."""
    yield
