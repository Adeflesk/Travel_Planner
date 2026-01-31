"""
app/routers/admin.py - Admin endpoints router

Admin-only endpoints for user management and system administration.

Author: Travel Planner Team
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.schemas.auth import (
    UserResponse,
    AdminUserCreate,
    AdminUserUpdate,
)
from app.core.deps import get_admin_user
from app.core.security import get_password_hash
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """List all users (admin only)."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Get a specific user by ID (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/users/", response_model=UserResponse, status_code=201)
def create_user(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Create a new user (admin only)."""
    # Check if email already exists
    existing = (
        db.query(models.User).filter(models.User.email == user_data.email).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with specified role
    user = models.User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=models.UserRole(user_data.role),
        is_active=user_data.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Update a user (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == admin.id and user_update.is_active is False:
        raise HTTPException(
            status_code=400, detail="Cannot deactivate your own account"
        )

    # Prevent admin from removing their own admin role
    if user.id == admin.id and user_update.role == "user":
        raise HTTPException(
            status_code=400, detail="Cannot remove admin role from your own account"
        )

    # Check email uniqueness if changing email
    if user_update.email and user_update.email != user.email:
        existing = (
            db.query(models.User).filter(models.User.email == user_update.email).first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_update.email

    if user_update.full_name is not None:
        user.full_name = user_update.full_name

    if user_update.role is not None:
        user.role = models.UserRole(user_update.role)

    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Delete a user (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deleting themselves
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    db.delete(user)
    db.commit()
    return None


@router.post("/users/{user_id}/reset-password", status_code=204)
def reset_user_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Reset a user's password (admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )

    user.hashed_password = get_password_hash(new_password)
    db.commit()
    return None


@router.get("/stats/")
def get_admin_stats(
    db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)
):
    """Get system statistics (admin only)."""
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active.is_(True)).count()
    total_trips = db.query(models.Trip).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "total_trips": total_trips,
    }
