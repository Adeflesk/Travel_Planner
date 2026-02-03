from app.core import security


def test_password_hash_and_verify():
    plain = "S3cureP@ssw0rd"
    hashed = security.get_password_hash(plain)
    assert isinstance(hashed, str) and len(hashed) > 0
    assert security.verify_password(plain, hashed)
    assert not security.verify_password("wrong", hashed)


def test_create_and_decode_tokens():
    data = {"sub": "123", "email": "u@example.com", "role": "user"}
    access = security.create_access_token(data)
    refresh = security.create_refresh_token(data)

    td_access = security.decode_token(access)
    assert td_access is not None
    assert td_access.user_id == 123
    assert td_access.token_type == "access"

    td_refresh = security.decode_token(refresh)
    assert td_refresh is not None
    assert td_refresh.token_type == "refresh"


def test_decode_token_missing_sub_and_invalid():
    # Token created without 'sub' should be treated as invalid by decode_token
    token_no_sub = security.create_access_token({"email": "x@x.com"})
    assert security.decode_token(token_no_sub) is None

    # Completely invalid token
    assert security.decode_token("not-a-token") is None
