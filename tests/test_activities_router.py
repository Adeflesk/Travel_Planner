from datetime import date

from app import models


def _make_trip_with_dest(db, user_id):
    trip = models.Trip(
        name="TestTrip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    dest = models.Destination(name="Paris", trip_id=trip.id, country="France")
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return trip, dest


def _make_day(db, trip_id, date_val=date(2030, 1, 2)):
    day = models.TripDay(trip_id=trip_id, date=date_val, sort_order=0)
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


# --- Create ---


def test_create_activity_with_day(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)
    resp = client.post("/activities/", json={"title": "Eiffel Tower", "day_id": day.id})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Eiffel Tower"
    assert data["day_id"] == day.id


def test_create_activity_with_destination(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    resp = client.post(
        "/activities/", json={"title": "Louvre", "destination_id": dest.id}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["destination_id"] == dest.id
    assert data["day_id"] is None


def test_create_activity_requires_parent(client, test_user):
    resp = client.post("/activities/", json={"title": "Orphan"})
    assert resp.status_code == 422


# --- Read by trip ---


def test_get_trip_activities(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)
    a1 = models.DayActivity(title="Via Day", day_id=day.id, destination_id=dest.id)
    a2 = models.DayActivity(title="Via Dest", destination_id=dest.id)
    db_session.add_all([a1, a2])
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/activities")
    assert resp.status_code == 200
    titles = {a["title"] for a in resp.json()}
    assert "Via Day" in titles
    assert "Via Dest" in titles


def test_get_trip_activities_not_found(client, test_user):
    resp = client.get("/trips/99999/activities")
    assert resp.status_code == 404


# --- Read by destination ---


def test_get_destination_activities(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="Colosseum", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()

    resp = client.get(f"/destinations/{dest.id}/activities")
    assert resp.status_code == 200
    assert resp.json()[0]["title"] == "Colosseum"


def test_get_destination_activities_not_found(client, test_user):
    resp = client.get("/destinations/99999/activities")
    assert resp.status_code == 404


# --- Update ---


def test_update_activity(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="Old Title", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)

    resp = client.patch(
        f"/activities/{a.id}", json={"title": "New Title", "is_completed": True}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["is_completed"] is True


def test_update_activity_not_found(client, test_user):
    resp = client.patch("/activities/99999", json={"title": "x"})
    assert resp.status_code == 404


# --- Delete ---


def test_delete_activity(client, test_user, db_session):
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    a = models.DayActivity(title="To Delete", destination_id=dest.id)
    db_session.add(a)
    db_session.commit()
    db_session.refresh(a)

    resp = client.delete(f"/activities/{a.id}")
    assert resp.status_code == 204
    assert db_session.query(models.DayActivity).filter_by(id=a.id).first() is None


def test_delete_activity_not_found(client, test_user):
    resp = client.delete("/activities/99999")
    assert resp.status_code == 404


# --- Geocoding ---


from unittest.mock import patch  # noqa: E402


def test_create_activity_geocodes_location(client, test_user, db_session):
    """Activity with location but no coords gets geocoded on create."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch(
        "app.routers.activities.geocode", return_value=(48.8566, 2.3522)
    ) as mock_geo:
        resp = client.post(
            "/activities/",
            json={
                "title": "Eiffel Tower",
                "day_id": day.id,
                "location": "Eiffel Tower, Paris",
            },
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] == 48.8566
    assert data["longitude"] == 2.3522
    mock_geo.assert_called_once_with("Eiffel Tower, Paris")


def test_create_activity_skips_geocode_when_coords_provided(
    client, test_user, db_session
):
    """Activity with explicit coords skips geocoding."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch("app.routers.activities.geocode") as mock_geo:
        resp = client.post(
            "/activities/",
            json={
                "title": "Eiffel Tower",
                "day_id": day.id,
                "location": "Paris",
                "latitude": 48.8566,
                "longitude": 2.3522,
            },
        )

    assert resp.status_code == 201
    mock_geo.assert_not_called()


def test_create_activity_succeeds_when_geocode_fails(client, test_user, db_session):
    """Geocoding failure does not fail the save."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    with patch("app.routers.activities.geocode", return_value=None):
        resp = client.post(
            "/activities/",
            json={"title": "Mystery Place", "day_id": day.id, "location": "Nowhere"},
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["latitude"] is None
    assert data["longitude"] is None


def test_update_activity_geocodes_new_location(client, test_user, db_session):
    """Updating location with no coords triggers re-geocoding."""
    trip, dest = _make_trip_with_dest(db_session, test_user["user"].id)
    day = _make_day(db_session, trip.id)

    # Create activity without coords
    resp = client.post("/activities/", json={"title": "A", "day_id": day.id})
    activity_id = resp.json()["id"]

    with patch(
        "app.routers.activities.geocode", return_value=(51.5074, -0.1278)
    ) as mock_geo:
        resp = client.patch(
            f"/activities/{activity_id}",
            json={"location": "London"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["latitude"] == 51.5074
    mock_geo.assert_called_once_with("London")
