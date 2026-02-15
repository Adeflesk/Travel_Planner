"""
tests/test_admin.py - Tests for admin endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models import Base, User, UserRole
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


@pytest.fixture
def admin_user():
    """Create an admin user and return their data with token."""
    db = TestingSessionLocal()
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    db.close()
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def regular_user():
    """Create a regular user and return their data with token."""
    db = TestingSessionLocal()
    user = User(
        email="user@example.com",
        hashed_password=get_password_hash("userpassword"),
        full_name="Regular User",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    db.close()
    return {
        "user": user,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


class TestAdminEndpoints:
    """Test admin endpoints."""

    def test_list_users_as_admin(self, client, admin_user):
        """Test listing users as admin."""
        response = client.get("/admin/users/", headers=admin_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(u["email"] == "admin@example.com" for u in data)

    def test_list_users_as_regular_user_fails(self, client, regular_user):
        """Test listing users as non-admin fails."""
        response = client.get("/admin/users/", headers=regular_user["headers"])
        assert response.status_code == 403

    def test_list_users_unauthorized(self, client):
        """Test listing users without auth fails."""
        response = client.get("/admin/users/")
        assert response.status_code == 401  # No credentials

    def test_get_user_as_admin(self, client, admin_user, regular_user):
        """Test getting a specific user as admin."""
        response = client.get(
            f"/admin/users/{regular_user['user'].id}", headers=admin_user["headers"]
        )
        assert response.status_code == 200
        assert response.json()["email"] == "user@example.com"

    def test_get_nonexistent_user(self, client, admin_user):
        """Test getting non-existent user returns 404."""
        response = client.get("/admin/users/99999", headers=admin_user["headers"])
        assert response.status_code == 404

    def test_create_user_as_admin(self, client, admin_user):
        """Test creating a user as admin."""
        response = client.post(
            "/admin/users/",
            json={
                "email": "newuser@example.com",
                "password": "newpassword123",
                "full_name": "New User",
                "role": "user",
            },
            headers=admin_user["headers"],
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["role"] == "user"

    def test_create_admin_user(self, client, admin_user):
        """Test creating an admin user."""
        response = client.post(
            "/admin/users/",
            json={
                "email": "newadmin@example.com",
                "password": "adminpassword123",
                "role": "admin",
            },
            headers=admin_user["headers"],
        )
        assert response.status_code == 201
        assert response.json()["role"] == "admin"

    def test_create_user_duplicate_email(self, client, admin_user):
        """Test creating user with existing email fails."""
        response = client.post(
            "/admin/users/",
            json={
                "email": "admin@example.com",
                "password": "somepassword123",
            },
            headers=admin_user["headers"],
        )
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_update_user_as_admin(self, client, admin_user, regular_user):
        """Test updating a user as admin."""
        response = client.patch(
            f"/admin/users/{regular_user['user'].id}",
            json={"full_name": "Updated Name"},
            headers=admin_user["headers"],
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"

    def test_deactivate_user(self, client, admin_user, regular_user):
        """Test deactivating a user."""
        response = client.patch(
            f"/admin/users/{regular_user['user'].id}",
            json={"is_active": False},
            headers=admin_user["headers"],
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_change_user_role(self, client, admin_user, regular_user):
        """Test changing a user's role."""
        response = client.patch(
            f"/admin/users/{regular_user['user'].id}",
            json={"role": "admin"},
            headers=admin_user["headers"],
        )
        assert response.status_code == 200
        assert response.json()["role"] == "admin"

    def test_cannot_deactivate_self(self, client, admin_user):
        """Test admin cannot deactivate themselves."""
        response = client.patch(
            f"/admin/users/{admin_user['user'].id}",
            json={"is_active": False},
            headers=admin_user["headers"],
        )
        assert response.status_code == 400
        assert "Cannot deactivate your own account" in response.json()["detail"]

    def test_cannot_remove_own_admin_role(self, client, admin_user):
        """Test admin cannot remove their own admin role."""
        response = client.patch(
            f"/admin/users/{admin_user['user'].id}",
            json={"role": "user"},
            headers=admin_user["headers"],
        )
        assert response.status_code == 400
        assert "Cannot remove admin role" in response.json()["detail"]

    def test_delete_user_as_admin(self, client, admin_user, regular_user):
        """Test deleting a user as admin."""
        response = client.delete(
            f"/admin/users/{regular_user['user'].id}", headers=admin_user["headers"]
        )
        assert response.status_code == 204

        # Verify user is deleted
        response = client.get(
            f"/admin/users/{regular_user['user'].id}", headers=admin_user["headers"]
        )
        assert response.status_code == 404

    def test_cannot_delete_self(self, client, admin_user):
        """Test admin cannot delete themselves."""
        response = client.delete(
            f"/admin/users/{admin_user['user'].id}", headers=admin_user["headers"]
        )
        assert response.status_code == 400
        assert "Cannot delete your own account" in response.json()["detail"]

    def test_get_admin_stats(self, client, admin_user, regular_user):
        """Test getting admin statistics."""
        response = client.get("/admin/stats/", headers=admin_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "active_users" in data
        assert "total_trips" in data
        assert data["total_users"] >= 2  # admin + regular user
