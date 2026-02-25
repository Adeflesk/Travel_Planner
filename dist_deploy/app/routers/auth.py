"""
app/routers/auth.py - Authentication router.

Provides endpoints for:
- User registration
- User login
- Token refresh
- Get current user profile
- Update user profile
- Change password

Rate limits:
- Login: 5 requests per minute (prevents brute force)
- Register: 3 requests per minute (prevents spam)
- Change password: 3 requests per minute
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models import User
from app.schemas.auth import (
    PasswordChange,
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)
from database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    - **email**: Unique email address
    - **password**: Minimum 8 characters
    - **full_name**: Optional full name

    Rate limited to 3 requests per minute.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return access/refresh tokens.

    - **email**: User's email address
    - **password**: User's password

    Rate limited to 5 requests per minute to prevent brute force attacks.
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive"
        )

    # Create tokens
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    return Token(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=Token)
@limiter.limit("10/minute")
def refresh_token(
    request: Request, token_request: RefreshTokenRequest, db: Session = Depends(get_db)
):
    """
    Refresh access token using a valid refresh token.

    - **refresh_token**: Valid refresh token

    Rate limited to 10 requests per minute.
    """
    token_data = decode_token(token_request.refresh_token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    if token_data.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )

    # Get user from database
    user = db.query(User).filter(User.id == token_data.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive"
        )

    # Create new tokens
    new_token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    }

    return Token(
        access_token=create_access_token(new_token_data),
        refresh_token=create_refresh_token(new_token_data),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current user's profile.

    - **full_name**: Optional new full name
    - **email**: Optional new email (must be unique)
    """
    # Check if new email is already taken
    if user_update.email and user_update.email != current_user.email:
        existing = db.query(User).filter(User.email == user_update.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use"
            )
        current_user.email = user_update.email

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def change_password(
    request: Request,
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change current user's password.

    - **current_password**: Current password for verification
    - **new_password**: New password (minimum 8 characters)

    Rate limited to 3 requests per minute.
    """
    # Verify current password
    if not verify_password(
        password_change.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()

    return None
