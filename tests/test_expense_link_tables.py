"""
tests/test_expense_link_tables.py

Tests for transport_expenses and stop_expenses M2M link tables.
Verifies that the tables exist, FK constraints cascade correctly, and
the SQLAlchemy relationships on Expense / TripTransport / Destination work.
"""

from datetime import date

from sqlalchemy import inspect, text

from app import models


# ---------------------------------------------------------------------------
# Schema existence
# ---------------------------------------------------------------------------


def test_transport_expenses_table_exists(db_session):
    inspector = inspect(db_session.get_bind())
    assert "transport_expenses" in inspector.get_table_names()


def test_stop_expenses_table_exists(db_session):
    inspector = inspect(db_session.get_bind())
    assert "stop_expenses" in inspector.get_table_names()


def test_transport_expenses_columns(db_session):
    inspector = inspect(db_session.get_bind())
    cols = {c["name"] for c in inspector.get_columns("transport_expenses")}
    assert {"transport_id", "expense_id"} <= cols


def test_stop_expenses_columns(db_session):
    inspector = inspect(db_session.get_bind())
    cols = {c["name"] for c in inspector.get_columns("stop_expenses")}
    assert {"destination_id", "expense_id"} <= cols


# ---------------------------------------------------------------------------
# ORM relationship tests
# ---------------------------------------------------------------------------


def _make_trip(db, user_id: int) -> models.Trip:
    trip = models.Trip(
        name="Link Table Test Trip",
        description="",
        start_date=date(2030, 6, 1),
        end_date=date(2030, 6, 10),
        budget=5000,
        status="planning",
        user_id=user_id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _make_expense(db, trip_id: int) -> models.Expense:
    expense = models.Expense(
        trip_id=trip_id,
        category="transport",
        amount=120.00,
        currency="USD",
        date=date(2030, 6, 2),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def test_transport_expense_link_via_orm(test_user, db_session):
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    expense = _make_expense(db, trip.id)

    transport = models.TripTransport(
        trip_id=trip.id,
        transport_type="flight",
        origin="London",
        destination="Paris",
    )
    db.add(transport)
    db.commit()
    db.refresh(transport)

    # Link via M2M
    expense.linked_transports.append(transport)
    db.commit()

    db.refresh(expense)
    assert transport in expense.linked_transports

    db.refresh(transport)
    assert expense in transport.linked_expenses


def test_stop_expense_link_via_orm(test_user, db_session):
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    expense = _make_expense(db, trip.id)

    destination = models.Destination(
        trip_id=trip.id,
        name="Rome",
        country="Italy",
    )
    db.add(destination)
    db.commit()
    db.refresh(destination)

    expense.linked_stops.append(destination)
    db.commit()

    db.refresh(expense)
    assert destination in expense.linked_stops

    db.refresh(destination)
    assert expense in destination.linked_expenses


def test_transport_expense_cascade_on_expense_delete(test_user, db_session):
    """Deleting an expense removes its transport_expenses rows."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    expense = _make_expense(db, trip.id)

    transport = models.TripTransport(
        trip_id=trip.id,
        transport_type="train",
        origin="Berlin",
        destination="Munich",
    )
    db.add(transport)
    db.commit()
    db.refresh(transport)

    expense.linked_transports.append(transport)
    db.commit()

    expense_id = expense.id
    transport_id = transport.id

    db.delete(expense)
    db.commit()

    row = db.execute(
        text(
            "SELECT 1 FROM transport_expenses "
            "WHERE transport_id=:tid AND expense_id=:eid"
        ),
        {"tid": transport_id, "eid": expense_id},
    ).fetchone()
    assert row is None


def test_stop_expense_cascade_on_destination_delete(test_user, db_session):
    """Deleting a destination removes its stop_expenses rows."""
    db = db_session
    trip = _make_trip(db, test_user["user"].id)
    expense = _make_expense(db, trip.id)

    destination = models.Destination(trip_id=trip.id, name="Athens", country="Greece")
    db.add(destination)
    db.commit()
    db.refresh(destination)

    expense.linked_stops.append(destination)
    db.commit()

    dest_id = destination.id
    expense_id = expense.id

    db.delete(destination)
    db.commit()

    row = db.execute(
        text(
            "SELECT 1 FROM stop_expenses "
            "WHERE destination_id=:did AND expense_id=:eid"
        ),
        {"did": dest_id, "eid": expense_id},
    ).fetchone()
    assert row is None
