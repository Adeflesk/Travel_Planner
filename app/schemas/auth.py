"""
app/schemas/auth.py - Pydantic schemas for authentication.

Defines request and response models for auth endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (excludes password)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def convert_role(cls, v):
        """Convert UserRole enum to string."""
        if hasattr(v, "value"):
            return v.value
        return v


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class Token(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class TripShareCreate(BaseModel):
    """Schema for creating a trip share."""

    email: EmailStr


class TripShareResponse(BaseModel):
    """Schema for trip share response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    trip_id: int
    user_id: int
    permission: str
    created_at: datetime
    user_email: Optional[str] = None

    @classmethod
    def from_orm_with_email(cls, share, user_email: str):
        """Create response with user email included."""
        return cls(
            id=share.id,
            trip_id=share.trip_id,
            user_id=share.user_id,
            permission=share.permission,
            created_at=share.created_at,
            user_email=user_email,
        )


# Admin Schemas
class AdminUserUpdate(BaseModel):
    """Schema for admin updating a user."""

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["admin", "user"]:
            raise ValueError("Role must be admin or user")
        return v


class AdminUserCreate(BaseModel):
    """Schema for admin creating a user."""

    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ["admin", "user"]:
            raise ValueError("Role must be admin or user")
        return v


class AdminResetPassword(BaseModel):
    """Schema for admin resetting a user's password."""

    new_password: str = Field(..., min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
