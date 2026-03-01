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
