"""
Tests for cross-user authorization on the trip-days and activities endpoints.

Verifies that authenticated users cannot read, modify, or delete resources
that belong to another user's trip.
"""
from datetime import date

from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_trip(db, user_id, name="Owner Trip"):
    trip = models.Trip(
        name=name,
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _make_day(db, trip_id):
    day = models.TripDay(
        trip_id=trip_id,
        date=date(2030, 1, 2),
    )
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


def _make_activity(db, day_id):
    act = models.DayActivity(
        day_id=day_id,
        title="Test Activity",
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return act


# ---------------------------------------------------------------------------
# Trip-day ownership tests
# ---------------------------------------------------------------------------


class TestTripDayOwnership:
    """Authenticated requests made by a non-owner user should be rejected."""

    def test_list_days_for_another_users_trip_returns_forbidden(
        self, client, test_user, db_session
    ):
        """GET /trip-days/trips/{id}/days should return 403 for non-owner."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)

        resp = client.get(f"/trip-days/trips/{trip.id}/days")
        assert resp.status_code == 403, resp.text

    def test_create_day_for_another_users_trip_returns_forbidden(
        self, client, test_user, db_session
    ):
        """POST /trip-days/ with a foreign trip_id should return 403."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)

        resp = client.post(
            "/trip-days/",
            json={"trip_id": trip.id, "date": "2030-01-03", "title": "Intruder Day"},
        )
        assert resp.status_code in (403, 404), resp.text

    def test_update_day_belonging_to_another_user_returns_forbidden(
        self, client, test_user, db_session
    ):
        """PATCH /trip-days/{id} should return 403 for non-owner."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)

        resp = client.patch(f"/trip-days/{day.id}", json={"title": "Stolen Title"})
        assert resp.status_code in (403, 404), resp.text

    def test_delete_day_belonging_to_another_user_returns_forbidden(
        self, client, test_user, db_session
    ):
        """DELETE /trip-days/{id} should return 403 for non-owner."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)

        resp = client.delete(f"/trip-days/{day.id}")
        assert resp.status_code in (403, 404), resp.text

        # Confirm the day was not actually deleted
        still_there = db_session.get(models.TripDay, day.id)
        assert still_there is not None


# ---------------------------------------------------------------------------
# Activity ownership tests
# ---------------------------------------------------------------------------


class TestActivityOwnership:
    """Activity endpoints should enforce ownership through the parent day."""

    def test_list_activities_for_foreign_day_returns_forbidden(
        self, client, test_user, db_session
    ):
        """GET /trip-days/{id}/activities should return 403 for a day the user doesn't own."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)

        resp = client.get(f"/trip-days/{day.id}/activities")
        assert resp.status_code in (403, 404), resp.text

    def test_create_activity_for_foreign_day_returns_forbidden(
        self, client, test_user, db_session
    ):
        """POST /activities/ with a foreign day_id should return 403."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)

        resp = client.post(
            "/activities/",
            json={
                "day_id": day.id,
                "title": "Intruder Activity",
                "start_time": "09:00",
            },
        )
        assert resp.status_code in (403, 404), resp.text

    def test_update_foreign_activity_returns_forbidden(
        self, client, test_user, db_session
    ):
        """PATCH /activities/{id} should return 403 for an activity the user doesn't own."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)
        activity = _make_activity(db_session, day.id)

        resp = client.patch(f"/activities/{activity.id}", json={"title": "Stolen"})
        assert resp.status_code in (403, 404), resp.text

    def test_delete_foreign_activity_returns_forbidden(
        self, client, test_user, db_session
    ):
        """DELETE /activities/{id} should return 403 for an activity the user doesn't own."""
        from conftest import create_other_user

        other_user, _token = create_other_user(db_session)
        trip = _make_trip(db_session, other_user.id)
        day = _make_day(db_session, trip.id)
        activity = _make_activity(db_session, day.id)

        resp = client.delete(f"/activities/{activity.id}")
        assert resp.status_code in (403, 404), resp.text

        still_there = db_session.get(models.DayActivity, activity.id)
        assert still_there is not None


# ---------------------------------------------------------------------------
# Unauthenticated access
# ---------------------------------------------------------------------------


class TestUnauthenticatedAccess:
    """All day/activity endpoints should require authentication."""

    def test_list_days_unauthenticated(self, unauthenticated_client):
        resp = unauthenticated_client.get("/trip-days/trips/1/days")
        assert resp.status_code == 401

    def test_create_day_unauthenticated(self, unauthenticated_client):
        resp = unauthenticated_client.post(
            "/trip-days/",
            json={"trip_id": 1, "date": "2030-01-01", "title": "x"},
        )
        assert resp.status_code == 401

    def test_list_activities_unauthenticated(self, unauthenticated_client):
        resp = unauthenticated_client.get("/trip-days/1/activities")
        assert resp.status_code == 401

    def test_create_activity_unauthenticated(self, unauthenticated_client):
        resp = unauthenticated_client.post(
            "/activities/",
            json={"day_id": 1, "title": "x", "start_time": "09:00"},
        )
        assert resp.status_code == 401
