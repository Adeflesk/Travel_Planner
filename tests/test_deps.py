from fastapi.security import HTTPAuthorizationCredentials
from fastapi import HTTPException

import pytest

from app.core import deps
from app.core.security import create_access_token, create_refresh_token
from app import models


@pytest.mark.anyio
async def test_get_current_user_success(db_session, test_user):
    # test_user fixture created a user and token
    db = db_session
    creds = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials=test_user["token"]
    )
    user = await deps.get_current_user(creds, db)
    assert user.email == "test@example.com"
    assert user.is_active


@pytest.mark.anyio
async def test_get_current_user_no_credentials(db_session, db_setup):
    db = db_session
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(None, db)
    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_get_current_user_invalid_token(db_session, db_setup):
    db = db_session
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid")
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(creds, db)
    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_get_current_user_wrong_token_type(db_session, db_setup):
    # Create a user to point token at
    db = db_session
    user = models.User(
        email="u2@example.com", hashed_password="x", full_name="U2", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh = create_refresh_token(
        {"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=refresh)
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(creds, db)
    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_get_current_user_nonexistent_user(db_session, db_setup):
    db = db_session
    token = create_access_token({"sub": "9999", "email": "no@one", "role": "user"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(creds, db)
    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_get_current_active_user_and_admin(db_session, db_setup):
    db = db_session
    # create inactive user
    u = models.User(
        email="inactive@example.com",
        hashed_password="x",
        full_name="I",
        is_active=False,
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_active_user(u)
    assert exc.value.status_code == 400

    # admin check: non-admin should raise
    admin = models.User(
        email="admin@example.com",
        hashed_password="x",
        full_name="A",
        is_active=True,
        role=models.UserRole.USER,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    with pytest.raises(HTTPException) as exc2:
        await deps.get_admin_user(admin)
    assert exc2.value.status_code == 403

    # make admin and succeed
    admin.role = models.UserRole.ADMIN
    db.commit()
    db.refresh(admin)
    res = await deps.get_admin_user(admin)
    assert res.id == admin.id
