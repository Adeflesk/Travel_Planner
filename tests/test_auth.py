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

    def test_forgot_password_unknown_email_returns_200(self, client):
        """Forgot password always returns 200 regardless of email existence."""
        response = client.post(
            "/auth/forgot-password",
            json={"email": "nobody@example.com"},
        )
        assert response.status_code == 200
        assert "reset link" in response.json()["message"]

    def test_forgot_password_known_email_creates_token(self, client):
        """Forgot password creates a reset token for a registered user."""
        client.post(
            "/auth/register",
            json={"email": "user@example.com", "password": "password123"},
        )
        response = client.post(
            "/auth/forgot-password",
            json={"email": "user@example.com"},
        )
        assert response.status_code == 200

        # Verify a token was actually created in the DB
        from app.models.password_reset_token import PasswordResetToken
        from app.models import User

        db = next(override_get_db())
        user = db.query(User).filter(User.email == "user@example.com").first()
        token_count = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False,  # noqa: E712
            )
            .count()
        )
        db.close()
        assert token_count == 1

    def test_reset_password_invalid_token_returns_400(self, client):
        """Reset with a bad token returns 400."""
        response = client.post(
            "/auth/reset-password",
            json={"token": "badtoken", "new_password": "newpassword123"},
        )
        assert response.status_code == 400

    def test_reset_password_valid_token_updates_password(self, client):
        """Reset with a valid token updates the password and marks token used."""
        import hashlib
        import secrets
        from datetime import datetime, timedelta
        from app.models.password_reset_token import PasswordResetToken
        from app.models import User

        # Register user
        client.post(
            "/auth/register",
            json={"email": "user@example.com", "password": "oldpassword"},
        )

        # Manually create a valid reset token in the test DB
        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()

        # Get the test DB session
        db = next(override_get_db())
        user = db.query(User).filter(User.email == "user@example.com").first()
        token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(token)
        db.commit()
        db.close()

        # Reset password
        response = client.post(
            "/auth/reset-password",
            json={"token": raw, "new_password": "newpassword123"},
        )
        assert response.status_code == 204

        # Verify old password no longer works
        old_login_response = client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "oldpassword"},
        )
        assert old_login_response.status_code == 401

        # Verify new password works
        login_response = client.post(
            "/auth/login",
            json={"email": "user@example.com", "password": "newpassword123"},
        )
        assert login_response.status_code == 200
