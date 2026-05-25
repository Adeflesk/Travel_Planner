from datetime import date
from app import models


def _make_trip(db, user_id):
    trip = models.Trip(
        name="Southwest Road Trip",
        start_date=date(2030, 9, 1),
        end_date=date(2030, 9, 14),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_create_pre_trip_task(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    resp = client.post(
        f"/trips/{trip.id}/pre-trip-tasks",
        json={
            "title": "Book Antelope Canyon Tour",
            "status": "pending",
            "book_by_date": "2030-06-01",
            "url": "https://example.com/book",
            "cost": 85.0,
            "currency": "USD",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Book Antelope Canyon Tour"
    assert data["status"] == "pending"
    assert data["trip_id"] == trip.id


def test_list_pre_trip_tasks(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    client.post(
        f"/trips/{trip.id}/pre-trip-tasks",
        json={"title": "Task A", "status": "pending"},
    )
    client.post(
        f"/trips/{trip.id}/pre-trip-tasks", json={"title": "Task B", "status": "booked"}
    )
    resp = client.get(f"/trips/{trip.id}/pre-trip-tasks")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_patch_pre_trip_task_status(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    create = client.post(
        f"/trips/{trip.id}/pre-trip-tasks",
        json={"title": "Buy Pass", "status": "pending"},
    )
    task_id = create.json()["id"]
    resp = client.patch(f"/pre-trip-tasks/{task_id}", json={"status": "booked"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "booked"


def test_delete_pre_trip_task(client, test_user, db_session):
    trip = _make_trip(db_session, test_user["user"].id)
    create = client.post(
        f"/trips/{trip.id}/pre-trip-tasks",
        json={"title": "Permits", "status": "pending"},
    )
    task_id = create.json()["id"]
    resp = client.delete(f"/pre-trip-tasks/{task_id}")
    assert resp.status_code == 204
    list_resp = client.get(f"/trips/{trip.id}/pre-trip-tasks")
    assert len(list_resp.json()) == 0


def test_pre_trip_tasks_require_auth(unauthenticated_client, db_session):
    resp = unauthenticated_client.get("/trips/1/pre-trip-tasks")
    assert resp.status_code == 401


def test_pre_trip_tasks_cross_trip_isolation(client, test_user, db_session):
    from conftest import create_other_user

    other_user, _ = create_other_user(db_session)
    other_trip = models.Trip(
        name="Other Trip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        status="planning",
        user_id=other_user.id,
    )
    db_session.add(other_trip)
    db_session.commit()
    db_session.refresh(other_trip)
    resp = client.get(f"/trips/{other_trip.id}/pre-trip-tasks")
    assert resp.status_code == 404
