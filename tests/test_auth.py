"""
tests/test_auth.py - Tests for authentication endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import Base
from database import get_db

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Create test client with overridden database."""
    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    if previous_override is not None:
        app.dependency_overrides[get_db] = previous_override
    else:
        app.dependency_overrides.pop(get_db, None)


class TestAuthEndpoints:
    """Test authentication endpoints."""

    def test_register_user(self, client):
        """Test user registration."""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "testpassword123",
                "full_name": "Test User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == "user"
        assert data["is_active"] is True
        assert "id" in data

    def test_register_duplicate_email(self, client):
        """Test registration fails with duplicate email."""
        # Register first user
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        # Try to register again with same email
        response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "differentpassword"},
        )
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_short_password(self, client):
        """Test registration fails with short password."""
        response = client.post(
            "/auth/register", json={"email": "test@example.com", "password": "short"}
        )
        assert response.status_code == 422  # Validation error

    def test_login_success(self, client):
        """Test successful login."""
        # Register user
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        # Login
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        """Test login fails with wrong password."""
        # Register user
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        # Try to login with wrong password
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        """Test login fails for non-existent user."""
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "testpassword123"},
        )
        assert response.status_code == 401

    def test_get_me(self, client):
        """Test getting current user profile."""
        # Register and login
        client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "testpassword123",
                "full_name": "Test User",
            },
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Get profile
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"

    def test_get_me_unauthorized(self, client):
        """Test getting profile without token fails."""
        response = client.get("/auth/me")
        assert response.status_code == 401  # No credentials

    def test_get_me_invalid_token(self, client):
        """Test getting profile with invalid token fails."""
        response = client.get(
            "/auth/me", headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    def test_refresh_token(self, client):
        """Test token refresh."""
        # Register and login
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh tokens
        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_update_profile(self, client):
        """Test updating user profile."""
        # Register and login
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Update profile
        response = client.patch(
            "/auth/me",
            json={"full_name": "Updated Name"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

    def test_change_password(self, client):
        """Test changing password."""
        # Register and login
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Change password
        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword123",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 204

        # Verify can login with new password
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "newpassword123"},
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client):
        """Test changing password with wrong current password fails."""
        # Register and login
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )
        token = login_response.json()["access_token"]

        # Try to change password with wrong current
        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
