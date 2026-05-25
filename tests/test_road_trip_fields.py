from datetime import date
from app import models


def _make_trip_and_day(db, user_id):
    trip = models.Trip(
        name="Road Trip",
        start_date=date(2030, 6, 1),
        end_date=date(2030, 6, 14),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    day = models.TripDay(trip_id=trip.id, date=date(2030, 6, 1), sort_order=0)
    db.add(day)
    db.commit()
    db.refresh(day)
    return trip, day


def test_activity_book_by_date_create(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    resp = client.post(
        "/activities/",
        json={
            "title": "Permits",
            "day_id": day.id,
            "book_by_date": "2030-04-01",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["book_by_date"] == "2030-04-01"


def test_activity_book_by_date_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post("/activities/", json={"title": "Tour", "day_id": day.id})
    activity_id = create.json()["id"]
    resp = client.patch(
        f"/activities/{activity_id}", json={"book_by_date": "2030-05-15"}
    )
    assert resp.status_code == 200
    assert resp.json()["book_by_date"] == "2030-05-15"


def test_activity_book_by_date_null_when_booked(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post(
        "/activities/",
        json={"title": "Tour", "day_id": day.id, "book_by_date": "2030-05-15"},
    )
    activity_id = create.json()["id"]
    resp = client.patch(
        f"/activities/{activity_id}", json={"booked": True, "book_by_date": None}
    )
    assert resp.status_code == 200
    assert resp.json()["book_by_date"] is None


def test_day_alerts_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    alerts = [
        {"text": "Flash flood risk in afternoon", "severity": "warning"},
        {"text": "Shuttle timing: first at 6am", "severity": "info"},
    ]
    resp = client.patch(f"/trip-days/{day.id}", json={"alerts": alerts})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["alerts"]) == 2
    assert data["alerts"][0]["severity"] == "warning"


def test_day_alerts_replace(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    client.patch(
        f"/trip-days/{day.id}", json={"alerts": [{"text": "A", "severity": "tip"}]}
    )
    resp = client.patch(f"/trip-days/{day.id}", json={"alerts": []})
    assert resp.status_code == 200
    assert resp.json()["alerts"] == []


def test_transport_waypoints_create(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    resp = client.post(
        f"/trips/{trip.id}/transport",
        json={
            "transport_type": "drive",
            "origin": "Las Vegas, NV",
            "destination": "Grand Canyon South Rim, AZ",
            "departure_day_id": day.id,
            "waypoints": "Hoover Dam\nOatman, AZ",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["waypoints"] is not None
    assert "Hoover Dam" in resp.json()["waypoints"]


def test_transport_waypoints_patch(client, test_user, db_session):
    trip, day = _make_trip_and_day(db_session, test_user["user"].id)
    create = client.post(
        f"/trips/{trip.id}/transport",
        json={
            "transport_type": "drive",
            "origin": "A",
            "destination": "B",
        },
    )
    assert create.status_code == 201
    t_id = create.json()["id"]
    resp = client.put(
        f"/transport/{t_id}",
        json={
            "transport_type": "drive",
            "origin": "A",
            "destination": "B",
            "waypoints": "Scenic Viewpoint",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["waypoints"] == "Scenic Viewpoint"
