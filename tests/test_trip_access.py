"""
tests/test_trip_access.py - Unit tests for the consolidated access control

Tests get_trip_with_access directly against the DB (no HTTP) — this is
the function every router will rely on, so its semantics are pinned
here once instead of re-proven through seven routers' endpoints.

Semantics under test (see app/core/trip_access.py docstring):
  * owner          -> view, edit, owner all pass
  * view share     -> view passes; edit/owner -> 403 (existence known)
  * edit share     -> view + edit pass; owner -> 403
  * no relation    -> 404 at every level (existence hidden)
  * missing trip   -> 404
"""

import pytest
from fastapi import HTTPException

from app import models
from app.core.security import get_password_hash
from app.core.trip_access import get_trip_with_access


@pytest.fixture()
def access_setup(db_setup, testing_session_local):
    """Owner, viewer, editor, stranger + one trip; yields (db, dict)."""
    db = testing_session_local()

    def make_user(email):
        u = models.User(
            email=email,
            hashed_password=get_password_hash("pw12345678"),
            full_name=email.split("@")[0],
            is_active=True,
        )
        db.add(u)
        return u

    owner = make_user("owner@example.com")
    viewer = make_user("viewer@example.com")
    editor = make_user("editor@example.com")
    stranger = make_user("stranger@example.com")
    db.commit()

    import datetime

    trip = models.Trip(
        name="Access Test Trip",
        start_date=datetime.date(2026, 9, 9),
        end_date=datetime.date(2026, 9, 21),
        user_id=owner.id,
    )
    db.add(trip)
    db.commit()

    db.add(models.TripShare(trip_id=trip.id, user_id=viewer.id, permission="view"))
    db.add(models.TripShare(trip_id=trip.id, user_id=editor.id, permission="edit"))
    db.commit()

    yield db, {
        "trip": trip,
        "owner": owner,
        "viewer": viewer,
        "editor": editor,
        "stranger": stranger,
    }
    db.close()


def _status(db, trip_id, user, level):
    """Helper: returns 200 on success, or the raised status code."""
    try:
        get_trip_with_access(trip_id, db, user, level)
        return 200
    except HTTPException as exc:
        return exc.status_code


# ----------------------------------------------------------------- owner


def test_owner_has_every_level(access_setup):
    db, ctx = access_setup
    for level in ("view", "edit", "owner"):
        assert _status(db, ctx["trip"].id, ctx["owner"], level) == 200


# ------------------------------------------------------------ view share


def test_viewer_can_view(access_setup):
    db, ctx = access_setup
    assert _status(db, ctx["trip"].id, ctx["viewer"], "view") == 200


def test_viewer_cannot_edit_gets_403_not_404(access_setup):
    """The bug this module fixes: view shares could previously mutate.

    403 (not 404) because a viewer already knows the trip exists —
    hiding it would be dishonest; denying the action is the point."""
    db, ctx = access_setup
    assert _status(db, ctx["trip"].id, ctx["viewer"], "edit") == 403
    assert _status(db, ctx["trip"].id, ctx["viewer"], "owner") == 403


# ------------------------------------------------------------ edit share


def test_editor_can_view_and_edit_but_not_own(access_setup):
    db, ctx = access_setup
    assert _status(db, ctx["trip"].id, ctx["editor"], "view") == 200
    assert _status(db, ctx["trip"].id, ctx["editor"], "edit") == 200
    assert _status(db, ctx["trip"].id, ctx["editor"], "owner") == 403


# -------------------------------------------------------------- stranger


def test_stranger_gets_404_at_every_level(access_setup):
    """No relationship -> existence is hidden, never 403."""
    db, ctx = access_setup
    for level in ("view", "edit", "owner"):
        assert _status(db, ctx["trip"].id, ctx["stranger"], level) == 404


def test_missing_trip_is_404(access_setup):
    db, ctx = access_setup
    assert _status(db, 999999, ctx["owner"], "view") == 404
