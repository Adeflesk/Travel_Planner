"""
tests/test_sharing.py - Tests for trip sharing endpoints.
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import Base, User, Trip, UserRole
from app.core.security import get_password_hash, create_access_token
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
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def owner_user():
    """Create a user who owns a trip."""
    db = TestingSessionLocal()
    user = User(
        email="owner@example.com",
        hashed_password=get_password_hash("ownerpassword"),
        full_name="Trip Owner",
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


@pytest.fixture
def other_user():
    """Create another user to share trips with."""
    db = TestingSessionLocal()
    user = User(
        email="other@example.com",
        hashed_password=get_password_hash("otherpassword"),
        full_name="Other User",
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


@pytest.fixture
def trip(owner_user):
    """Create a trip owned by owner_user."""
    db = TestingSessionLocal()
    trip = Trip(
        name="Test Trip",
        description="A test trip for sharing",
        start_date=date(2024, 6, 1),
        end_date=date(2024, 6, 15),
        status="planning",
        user_id=owner_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()
    return trip


class TestTripSharing:
    """Test trip sharing endpoints."""

    def test_share_trip_with_user(self, client, owner_user, other_user, trip):
        """Test sharing a trip with another user."""
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )
        assert response.status_code == 201
        data = response.json()
        assert data["user_email"] == "other@example.com"
        assert data["permission"] == "view"
        assert data["trip_id"] == trip.id

    def test_cannot_share_with_nonexistent_user(self, client, owner_user, trip):
        """Test that sharing with a non-existent user fails."""
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "nonexistent@example.com"},
            headers=owner_user["headers"],
        )
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_cannot_share_with_self(self, client, owner_user, trip):
        """Test that sharing with yourself fails."""
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "owner@example.com"},
            headers=owner_user["headers"],
        )
        assert response.status_code == 400
        assert "Cannot share trip with yourself" in response.json()["detail"]

    def test_cannot_share_duplicate(self, client, owner_user, other_user, trip):
        """Test that sharing with same user twice fails."""
        # First share
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )
        assert response.status_code == 201

        # Second share (duplicate)
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )
        assert response.status_code == 400
        assert "already shared" in response.json()["detail"]

    def test_non_owner_cannot_share(self, client, owner_user, other_user, trip):
        """Test that non-owners cannot share a trip."""
        # First share trip with other_user
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # Now other_user tries to share (should fail)
        response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "someone@example.com"},
            headers=other_user["headers"],
        )
        assert response.status_code == 404  # Trip "not found" for sharing

    def test_list_trip_shares(self, client, owner_user, other_user, trip):
        """Test listing shares for a trip."""
        # Share trip first
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # List shares
        response = client.get(
            f"/trips/{trip.id}/shares/", headers=owner_user["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_email"] == "other@example.com"

    def test_non_owner_cannot_list_shares(self, client, owner_user, other_user, trip):
        """Test that non-owners cannot list shares."""
        # Share trip with other_user
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # other_user tries to list shares (should fail)
        response = client.get(
            f"/trips/{trip.id}/shares/", headers=other_user["headers"]
        )
        assert response.status_code == 404

    def test_remove_share(self, client, owner_user, other_user, trip):
        """Test removing a share."""
        # Share trip first
        create_response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )
        share_id = create_response.json()["id"]

        # Remove share
        response = client.delete(
            f"/trips/{trip.id}/shares/{share_id}", headers=owner_user["headers"]
        )
        assert response.status_code == 204

        # Verify share is removed
        list_response = client.get(
            f"/trips/{trip.id}/shares/", headers=owner_user["headers"]
        )
        assert len(list_response.json()) == 0

    def test_shared_user_can_view_trip(self, client, owner_user, other_user, trip):
        """Test that a shared user can view the trip."""
        # Share trip
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # other_user views trip
        response = client.get(f"/trips/{trip.id}", headers=other_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Trip"
        assert data["is_owner"] is False
        assert data["shared_by"] == "owner@example.com"

    def test_shared_user_cannot_edit_trip(self, client, owner_user, other_user, trip):
        """Test that a shared user cannot edit the trip."""
        # Share trip
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # other_user tries to edit trip
        response = client.put(
            f"/trips/{trip.id}",
            json={"name": "Modified Trip"},
            headers=other_user["headers"],
        )
        assert response.status_code == 404  # Not found (access denied)

    def test_shared_user_cannot_delete_trip(self, client, owner_user, other_user, trip):
        """Test that a shared user cannot delete the trip."""
        # Share trip
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # other_user tries to delete trip
        response = client.delete(f"/trips/{trip.id}", headers=other_user["headers"])
        assert response.status_code == 404  # Not found (access denied)

    def test_shared_trips_appear_in_list(self, client, owner_user, other_user, trip):
        """Test that shared trips appear in the user's trip list."""
        # Share trip
        client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )

        # other_user lists trips
        response = client.get("/trips/", headers=other_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Trip"
        assert data[0]["is_owner"] is False
        assert data[0]["shared_by"] == "owner@example.com"

    def test_owner_trips_show_is_owner_true(self, client, owner_user, trip):
        """Test that owned trips show is_owner as True."""
        response = client.get("/trips/", headers=owner_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_owner"] is True
        assert data[0]["shared_by"] is None

    def test_unshared_trip_not_visible_to_others(
        self, client, owner_user, other_user, trip
    ):
        """Test that unshared trips are not visible to other users."""
        # other_user tries to view trip (not shared)
        response = client.get(f"/trips/{trip.id}", headers=other_user["headers"])
        assert response.status_code == 404

    def test_removing_share_revokes_access(self, client, owner_user, other_user, trip):
        """Test that removing a share revokes access."""
        # Share trip
        create_response = client.post(
            f"/trips/{trip.id}/shares/",
            json={"email": "other@example.com"},
            headers=owner_user["headers"],
        )
        share_id = create_response.json()["id"]

        # Verify access
        response = client.get(f"/trips/{trip.id}", headers=other_user["headers"])
        assert response.status_code == 200

        # Remove share
        client.delete(
            f"/trips/{trip.id}/shares/{share_id}", headers=owner_user["headers"]
        )

        # Verify access is revoked
        response = client.get(f"/trips/{trip.id}", headers=other_user["headers"])
        assert response.status_code == 404
