"""
Integration tests for trip-level aggregate endpoints.

These tests cover endpoints that aggregate data across multiple models:
- Expense summary
- Packing summary
- Trip progress
- Destinations with activities
- Accommodation expenses (timeline service)
- Cascade delete
- Root endpoint
"""
from datetime import date, timedelta
from decimal import Decimal

from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_trip(db, user_id, name="Test Trip", days=7):
    today = date(2030, 6, 1)
    trip = models.Trip(
        name=name,
        start_date=today,
        end_date=today + timedelta(days=days),
        budget=Decimal("5000.00"),
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def make_destination(db, trip_id, name, arrival_offset=0, departure_offset=3):
    base = date(2030, 6, 1)
    dest = models.Destination(
        name=name,
        trip_id=trip_id,
        arrival_date=base + timedelta(days=arrival_offset),
        departure_date=base + timedelta(days=departure_offset),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return dest


# ---------------------------------------------------------------------------
# Expense Summary
# ---------------------------------------------------------------------------


def test_expense_summary_empty(client, test_user, db_session):
    """Expense summary with no expenses returns zeros."""
    trip = make_trip(db_session, test_user["user"].id)

    resp = client.get(f"/trips/{trip.id}/expenses/summary/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["paid_total"] == 0
    assert data["unpaid_total"] == 0
    assert data["by_category"] == {}
    assert data["count"] == 0


def test_expense_summary_with_expenses(client, test_user, db_session):
    """Expense summary aggregates correctly across categories and paid status."""
    trip = make_trip(db_session, test_user["user"].id)

    rows = [
        models.Expense(
            trip_id=trip.id,
            category="food",
            amount=Decimal("50.00"),
            date=date(2030, 6, 1),
            paid=True,
        ),
        models.Expense(
            trip_id=trip.id,
            category="food",
            amount=Decimal("30.00"),
            date=date(2030, 6, 2),
            paid=False,
        ),
        models.Expense(
            trip_id=trip.id,
            category="transport",
            amount=Decimal("100.00"),
            date=date(2030, 6, 3),
            paid=True,
        ),
        models.Expense(
            trip_id=trip.id,
            category="accommodation",
            amount=Decimal("200.00"),
            date=date(2030, 6, 4),
            paid=False,
        ),
    ]
    db_session.add_all(rows)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/expenses/summary/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 380.0
    assert data["paid_total"] == 150.0
    assert data["unpaid_total"] == 230.0
    assert data["count"] == 4
    assert data["by_category"]["food"] == 80.0
    assert data["by_category"]["transport"] == 100.0
    assert data["by_category"]["accommodation"] == 200.0


def test_expense_summary_not_found(client, test_user):
    """Expense summary 404s for nonexistent trip."""
    resp = client.get("/trips/99999/expenses/summary/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Packing Summary
# ---------------------------------------------------------------------------


def test_packing_summary_empty(client, test_user, db_session):
    """Packing summary with no items returns zeros."""
    trip = make_trip(db_session, test_user["user"].id)

    resp = client.get(f"/trips/{trip.id}/packing/summary/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_items"] == 0
    assert data["packed_items"] == 0
    assert data["progress_percent"] == 0
    assert data["by_category"] == {}


def test_packing_summary_with_items(client, test_user, db_session):
    """Packing summary computes counts and percentages correctly."""
    trip = make_trip(db_session, test_user["user"].id)

    items = [
        models.PackingItem(
            trip_id=trip.id, item_name="T-Shirt", category="clothing", is_packed=True
        ),
        models.PackingItem(
            trip_id=trip.id, item_name="Jeans", category="clothing", is_packed=False
        ),
        models.PackingItem(
            trip_id=trip.id, item_name="Passport", category="documents", is_packed=True
        ),
        models.PackingItem(
            trip_id=trip.id,
            item_name="Toothbrush",
            category="toiletries",
            is_packed=False,
        ),
    ]
    db_session.add_all(items)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/packing/summary/")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_items"] == 4
    assert data["packed_items"] == 2
    assert data["progress_percent"] == 50
    assert data["by_category"]["clothing"]["total"] == 2
    assert data["by_category"]["clothing"]["packed"] == 1
    assert data["by_category"]["documents"]["total"] == 1
    assert data["by_category"]["documents"]["packed"] == 1
    assert data["by_category"]["toiletries"]["packed"] == 0


def test_packing_summary_not_found(client, test_user):
    """Packing summary 404s for nonexistent trip."""
    resp = client.get("/trips/99999/packing/summary/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Trip Progress
# ---------------------------------------------------------------------------


def test_trip_progress_empty(client, test_user, db_session):
    """Trip progress with no activities returns zeros."""
    trip = make_trip(db_session, test_user["user"].id)

    resp = client.get(f"/trips/{trip.id}/progress/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_activities"] == 0
    assert data["completed_activities"] == 0
    assert data["progress_percent"] == 0


def test_trip_progress_with_activities(client, test_user, db_session):
    """Trip progress reflects completed vs total activity counts."""
    trip = make_trip(db_session, test_user["user"].id)
    dest = make_destination(db_session, trip.id, "Paris")

    activities = [
        models.DayActivity(
            destination_id=dest.id, title="Eiffel Tower", is_completed=True
        ),
        models.DayActivity(destination_id=dest.id, title="Louvre", is_completed=True),
        models.DayActivity(
            destination_id=dest.id, title="Seine Cruise", is_completed=False
        ),
        models.DayActivity(
            destination_id=dest.id, title="Arc de Triomphe", is_completed=False
        ),
    ]
    db_session.add_all(activities)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/progress/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_activities"] == 4
    assert data["completed_activities"] == 2
    assert data["progress_percent"] == 50


def test_trip_progress_not_found(client, test_user):
    """Trip progress 404s for nonexistent trip."""
    resp = client.get("/trips/99999/progress/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Destinations With Activities
# ---------------------------------------------------------------------------


def test_destinations_with_activities_empty(client, test_user, db_session):
    """Returns empty list when trip has no destinations."""
    trip = make_trip(db_session, test_user["user"].id)

    resp = client.get(f"/trips/{trip.id}/destinations-with-activities/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_destinations_with_activities(client, test_user, db_session):
    """Returns destinations with their nested activities."""
    trip = make_trip(db_session, test_user["user"].id)
    dest1 = make_destination(
        db_session, trip.id, "Paris", arrival_offset=0, departure_offset=3
    )
    dest2 = make_destination(
        db_session, trip.id, "London", arrival_offset=3, departure_offset=7
    )

    acts = [
        models.DayActivity(destination_id=dest1.id, title="Eiffel Tower"),
        models.DayActivity(destination_id=dest1.id, title="Louvre"),
        models.DayActivity(destination_id=dest2.id, title="Big Ben"),
    ]
    db_session.add_all(acts)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/destinations-with-activities/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2

    paris = next(d for d in data if d["destination"]["name"] == "Paris")
    london = next(d for d in data if d["destination"]["name"] == "London")
    assert len(paris["activities"]) == 2
    assert {a["title"] for a in paris["activities"]} == {"Eiffel Tower", "Louvre"}
    assert len(london["activities"]) == 1
    assert london["activities"][0]["title"] == "Big Ben"


def test_destinations_with_activities_not_found(client, test_user):
    """404s for nonexistent trip."""
    resp = client.get("/trips/99999/destinations-with-activities/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Accommodation Expenses (via HTTP endpoint, replaces test_timeline_service.py)
# ---------------------------------------------------------------------------


def test_accommodation_expenses_empty(client, test_user, db_session):
    """No accommodation expenses when trip has no destinations."""
    trip = make_trip(db_session, test_user["user"].id)

    resp = client.get(f"/trips/{trip.id}/accommodation-expenses/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_accommodation_expenses_manual_link(client, test_user, db_session):
    """Expense explicitly linked to a destination appears grouped under it."""
    trip = make_trip(db_session, test_user["user"].id)
    dest = make_destination(
        db_session, trip.id, "Paris", arrival_offset=0, departure_offset=5
    )

    expense = models.Expense(
        trip_id=trip.id,
        destination_id=dest.id,
        category="accommodation",
        amount=Decimal("150.00"),
        date=date(2030, 6, 1),
        booked=True,
        paid=False,
    )
    db_session.add(expense)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/accommodation-expenses/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["destination"]["name"] == "Paris"
    assert len(data[0]["expenses"]) == 1
    assert data[0]["total"] == 150.0


def test_accommodation_expenses_auto_link_by_date(client, test_user, db_session):
    """Accommodation expense without destination_id is auto-linked by date range."""
    trip = make_trip(db_session, test_user["user"].id)
    make_destination(
        db_session, trip.id, "London", arrival_offset=0, departure_offset=5
    )

    # No destination_id — falls within London's date range
    expense = models.Expense(
        trip_id=trip.id,
        category="accommodation",
        amount=Decimal("200.00"),
        date=date(2030, 6, 2),  # within London's arrival–departure window
        booked=False,
        paid=False,
    )
    db_session.add(expense)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/accommodation-expenses/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["destination"]["name"] == "London"
    assert data[0]["total"] == 200.0


def test_accommodation_expenses_multiple_destinations(client, test_user, db_session):
    """Expenses are grouped correctly across multiple destinations."""
    trip = make_trip(db_session, test_user["user"].id)
    dest1 = make_destination(
        db_session, trip.id, "Paris", arrival_offset=0, departure_offset=3
    )
    dest2 = make_destination(
        db_session, trip.id, "London", arrival_offset=3, departure_offset=7
    )

    expenses = [
        models.Expense(
            trip_id=trip.id,
            destination_id=dest1.id,
            category="accommodation",
            amount=Decimal("100.00"),
            date=date(2030, 6, 1),
        ),
        models.Expense(
            trip_id=trip.id,
            destination_id=dest2.id,
            category="accommodation",
            amount=Decimal("150.00"),
            date=date(2030, 6, 4),
        ),
    ]
    db_session.add_all(expenses)
    db_session.commit()

    resp = client.get(f"/trips/{trip.id}/accommodation-expenses/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    by_name = {d["destination"]["name"]: d for d in data}
    assert by_name["Paris"]["total"] == 100.0
    assert by_name["London"]["total"] == 150.0


def test_accommodation_expenses_not_found(client, test_user):
    """404s for nonexistent trip."""
    resp = client.get("/trips/99999/accommodation-expenses/")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Cascade Delete
# ---------------------------------------------------------------------------


def test_cascade_delete_trip_removes_all_related_data(client, test_user, db_session):
    """Deleting a trip removes its destinations, expenses, and packing items."""
    trip = make_trip(db_session, test_user["user"].id)
    dest = make_destination(db_session, trip.id, "Paris")

    expense = models.Expense(
        trip_id=trip.id, category="food", amount=Decimal("50.00"), date=date(2030, 6, 1)
    )
    packing = models.PackingItem(trip_id=trip.id, item_name="Passport")
    db_session.add_all([expense, packing])
    db_session.commit()

    dest_id = dest.id

    resp = client.delete(f"/trips/{trip.id}")
    assert resp.status_code == 204

    # Destination gone
    assert client.get(f"/destinations/{dest_id}").status_code == 404

    # Expenses gone (trip endpoint returns 404 or empty)
    expenses_resp = client.get(f"/trips/{trip.id}/expenses/")
    assert expenses_resp.status_code in (404, 200)
    if expenses_resp.status_code == 200:
        assert expenses_resp.json() == []


# ---------------------------------------------------------------------------
# Root / Health
# ---------------------------------------------------------------------------


def test_root_endpoint(client, test_user):
    """Root endpoint returns expected version payload."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert data["version"] == "1.0.0"
