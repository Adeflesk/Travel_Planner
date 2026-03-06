"""
tests/test_activity_expense_sync.py

Verifies that creating or updating a DayActivity with a cost
automatically creates / updates / removes the corresponding
Expense row so that budget tracking reflects the activity cost.
"""
from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_trip_and_day(client, db):
    resp = client.post(
        "/trips/",
        json={
            "name": "Expense Sync Trip",
            "start_date": "2030-05-01",
            "end_date": "2030-05-10",
            "status": "planning",
            "budget": 2000,
        },
    )
    assert resp.status_code == 201
    trip_id = resp.json()["id"]

    resp = client.post(
        "/trip-days/",
        json={"trip_id": trip_id, "date": "2030-05-02", "title": "Day 1"},
    )
    assert resp.status_code == 201
    day_id = resp.json()["id"]
    return trip_id, day_id


# ---------------------------------------------------------------------------
# Create: activity WITH cost → expense row created
# ---------------------------------------------------------------------------


def test_create_activity_with_cost_creates_expense(client, test_user, db_session):
    """Creating an activity with cost > 0 should auto-create an Expense."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={
            "day_id": day_id,
            "title": "Museum",
            "category": "museum",
            "start_time": "10:00",
            "cost": 45.00,
        },
    )
    assert resp.status_code == 201
    activity_id = resp.json()["id"]

    # The expense should now exist
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
    )
    assert expense is not None, "Expected an Expense row to be created"
    assert float(expense.amount) == 45.00
    assert expense.trip_id == trip_id
    assert expense.category == "museum"
    assert expense.description == "Museum"


def test_create_activity_without_cost_creates_no_expense(client, test_user, db_session):
    """Creating an activity with no cost should NOT create an Expense."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={
            "day_id": day_id,
            "title": "Free Walk",
            "start_time": "09:00",
        },
    )
    assert resp.status_code == 201
    activity_id = resp.json()["id"]

    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
    )
    assert expense is None, "No Expense should be created for a cost-free activity"


# ---------------------------------------------------------------------------
# Update: cost added later → expense created
# ---------------------------------------------------------------------------


def test_update_adds_cost_creates_expense(client, test_user, db_session):
    """Updating an activity to add a cost should create the Expense."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={"day_id": day_id, "title": "Dinner", "start_time": "19:00"},
    )
    assert resp.status_code == 201
    activity_id = resp.json()["id"]

    # No expense yet
    assert (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
        is None
    )

    # Add a cost via PATCH
    resp = client.patch(f"/activities/{activity_id}", json={"cost": 60.0})
    assert resp.status_code == 200

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
    )
    assert expense is not None
    assert float(expense.amount) == 60.0


# ---------------------------------------------------------------------------
# Update: cost changed → expense updated
# ---------------------------------------------------------------------------


def test_update_changes_cost_updates_expense(client, test_user, db_session):
    """Patching an activity's cost should update the linked Expense amount."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={"day_id": day_id, "title": "Tour", "start_time": "11:00", "cost": 30.0},
    )
    assert resp.status_code == 201
    activity_id = resp.json()["id"]

    resp = client.patch(f"/activities/{activity_id}", json={"cost": 55.0})
    assert resp.status_code == 200

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
    )
    assert expense is not None
    assert float(expense.amount) == 55.0

    # Confirm only ONE expense exists (no duplicates)
    count = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .count()
    )
    assert count == 1


# ---------------------------------------------------------------------------
# Update: cost removed → expense deleted
# ---------------------------------------------------------------------------


def test_update_removes_cost_deletes_expense(client, test_user, db_session):
    """Setting cost to None/0 via PATCH should delete the linked Expense."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={
            "day_id": day_id,
            "title": "Bought ticket",
            "start_time": "13:00",
            "cost": 20.0,
        },
    )
    assert resp.status_code == 201
    activity_id = resp.json()["id"]

    # Confirm expense exists
    assert (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
        is not None
    )

    # Remove the cost
    resp = client.patch(f"/activities/{activity_id}", json={"cost": None})
    assert resp.status_code == 200

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.activity_id == activity_id)
        .first()
    )
    assert expense is None, "Expense should have been deleted when cost was removed"


# ---------------------------------------------------------------------------
# Budget total reflects activity cost
# ---------------------------------------------------------------------------


def test_budget_total_includes_activity_cost(client, test_user, db_session):
    """After creating a costed activity, /budget/status should show it in total_spent."""
    trip_id, day_id = _make_trip_and_day(client, db_session)

    resp = client.post(
        "/activities/",
        json={"day_id": day_id, "title": "Spa", "start_time": "14:00", "cost": 120.0},
    )
    assert resp.status_code == 201

    budget_resp = client.get(f"/trips/{trip_id}/budget-status/")
    assert budget_resp.status_code == 200
    data = budget_resp.json()

    assert float(data["total_spent"]) == 120.0
