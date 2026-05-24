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
