"""
tests/test_transport_expense_sync.py

Verifies that creating or updating a TripTransport with a cost
automatically creates / updates / removes the corresponding
Expense row so that budget tracking reflects the transport cost.
"""
from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_trip(client):
    resp = client.post(
        "/trips/",
        json={
            "name": "Transport Sync Trip",
            "start_date": "2030-07-01",
            "end_date": "2030-07-10",
            "status": "planning",
            "budget": 5000,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _make_day(client, trip_id, date_str="2030-07-02"):
    resp = client.post(
        "/trip-days/",
        json={"trip_id": trip_id, "date": date_str, "title": "Departure Day"},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_transport(client, trip_id, **kwargs):
    payload = {
        "transport_type": "flight",
        "origin": "London",
        "destination": "Paris",
        **kwargs,
    }
    resp = client.post(f"/trips/{trip_id}/transport", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Create: transport WITH cost → expense row created
# ---------------------------------------------------------------------------


def test_create_transport_with_cost_creates_expense(client, test_user, db_session):
    """Creating a transport with cost > 0 should auto-create an Expense."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id, cost=350.0)

    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is not None, "Expected an Expense row to be created"
    assert float(expense.amount) == 350.0
    assert expense.trip_id == trip_id
    assert expense.category == "flight"


def test_create_transport_without_cost_creates_no_expense(
    client, test_user, db_session
):
    """Creating a transport with no cost should NOT create an Expense."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id)  # no cost

    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is None


def test_create_transport_uses_departure_day_date(client, test_user, db_session):
    """The linked expense should use the departure day's date."""
    trip_id = _make_trip(client)
    day_id = _make_day(client, trip_id, "2030-07-03")

    t_id = _create_transport(client, trip_id, cost=200.0, departure_day_id=day_id)

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is not None
    assert str(expense.date) == "2030-07-03"


def test_create_transport_includes_carrier_in_description(
    client, test_user, db_session
):
    """When a carrier is set, it should be included in the expense description."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id, cost=120.0, carrier="EasyJet")

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is not None
    assert "EasyJet" in expense.description


# ---------------------------------------------------------------------------
# Update: cost added → expense created
# ---------------------------------------------------------------------------


def test_update_adds_cost_creates_expense(client, test_user, db_session):
    """Updating a transport to add a cost should create the Expense."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id)  # no cost

    assert (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    ) is None

    resp = client.put(f"/transport/{t_id}", json={"cost": 250.0})
    assert resp.status_code == 200

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is not None
    assert float(expense.amount) == 250.0


# ---------------------------------------------------------------------------
# Update: cost changed → expense updated (no duplicates)
# ---------------------------------------------------------------------------


def test_update_changes_cost_updates_expense(client, test_user, db_session):
    """Patching cost should update the linked Expense in place."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id, cost=100.0)

    resp = client.put(f"/transport/{t_id}", json={"cost": 189.99})
    assert resp.status_code == 200

    db_session.expire_all()
    expenses = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .all()
    )
    assert len(expenses) == 1, "Should not create duplicate expenses"
    assert abs(float(expenses[0].amount) - 189.99) < 0.01


# ---------------------------------------------------------------------------
# Update: cost removed → expense deleted
# ---------------------------------------------------------------------------


def test_update_removes_cost_deletes_expense(client, test_user, db_session):
    """Setting cost to null via PUT should delete the linked Expense."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id, cost=75.0)

    # Confirm expense exists
    assert (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    ) is not None

    resp = client.put(f"/transport/{t_id}", json={"cost": None})
    assert resp.status_code == 200

    db_session.expire_all()
    expense = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense is None, "Expense should have been deleted when cost was removed"


# ---------------------------------------------------------------------------
# Delete: transport deleted → expense cascade-deleted (ON DELETE SET NULL)
# ---------------------------------------------------------------------------


def test_delete_transport_nullifies_expense_transport_id(client, test_user, db_session):
    """Deleting a transport should SET NULL on the linked expense's transport_id (not delete it)."""
    trip_id = _make_trip(client)
    t_id = _create_transport(client, trip_id, cost=300.0)

    expense_before = (
        db_session.query(models.Expense)
        .filter(models.Expense.transport_id == t_id)
        .first()
    )
    assert expense_before is not None
    expense_id = expense_before.id

    resp = client.delete(f"/transport/{t_id}")
    assert resp.status_code == 204

    db_session.expire_all()
    expense_after = db_session.get(models.Expense, expense_id)
    # The expense row itself should survive (null FK, not cascaded delete)
    assert expense_after is not None
    assert expense_after.transport_id is None


# ---------------------------------------------------------------------------
# Budget total reflects transport cost
# ---------------------------------------------------------------------------


def test_budget_total_includes_transport_cost(client, test_user, db_session):
    """After creating a costed transport, /budget-status should show it in total_spent."""
    trip_id = _make_trip(client)
    _create_transport(client, trip_id, cost=450.0)

    budget_resp = client.get(f"/trips/{trip_id}/budget-status/")
    assert budget_resp.status_code == 200
    data = budget_resp.json()

    assert float(data["total_spent"]) == 450.0
    # Category should be transport_type
    categories = [c["category"] for c in data["by_category"]]
    assert "flight" in categories
