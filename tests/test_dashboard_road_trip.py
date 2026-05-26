from datetime import date, timedelta
from app import models


def _make_upcoming_trip(db, user_id, days_away=30):
    start = date.today() + timedelta(days=days_away)
    trip = models.Trip(
        name="Road Trip",
        start_date=start,
        end_date=start + timedelta(days=13),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def test_dashboard_pre_trip_task_action_item(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    db_task = models.PreTripTask(
        trip_id=trip.id,
        title="Book Antelope Canyon",
        status="pending",
        book_by_date=date.today() + timedelta(days=15),
    )
    db_session.add(db_task)
    db_session.commit()

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    items = resp.json()["action_items"]
    types = [i["type"] for i in items]
    assert "pre_trip_task" in types
    task_item = next(i for i in items if i["type"] == "pre_trip_task")
    assert "Antelope Canyon" in task_item["title"]
    assert "book by" in task_item["detail"].lower()


def test_dashboard_activity_deadline_action_item(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    day = models.TripDay(trip_id=trip.id, date=trip.start_date, sort_order=0)
    db_session.add(day)
    db_session.commit()
    db_session.refresh(day)

    activity = models.DayActivity(
        day_id=day.id,
        title="Zion Narrows Permit",
        booked=False,
        book_by_date=date.today() + timedelta(days=20),
        sort_order=0,
    )
    db_session.add(activity)
    db_session.commit()

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    items = resp.json()["action_items"]
    types = [i["type"] for i in items]
    assert "activity_deadline" in types
    act_item = next(i for i in items if i["type"] == "activity_deadline")
    assert "Narrows" in act_item["title"]
    assert "book by" in act_item["detail"].lower()
    assert act_item["day_id"] == day.id


def test_dashboard_no_action_for_booked_activity(client, test_user, db_session):
    trip = _make_upcoming_trip(db_session, test_user["user"].id)
    day = models.TripDay(trip_id=trip.id, date=trip.start_date, sort_order=0)
    db_session.add(day)
    db_session.commit()
    db_session.refresh(day)

    # Already booked — should NOT appear in action items
    activity = models.DayActivity(
        day_id=day.id,
        title="Already Booked Tour",
        booked=True,
        book_by_date=date.today() + timedelta(days=20),
        sort_order=0,
    )
    db_session.add(activity)
    db_session.commit()

    resp = client.get("/api/dashboard")
    items = resp.json()["action_items"]
    assert not any(i["type"] == "activity_deadline" for i in items)
