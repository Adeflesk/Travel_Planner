"""Tests for accommodation CRUD and expense sync logic."""
import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app import models, schemas
from app.services.accommodation_service import (
    create_accommodation,
    update_accommodation,
    delete_accommodation,
    get_accommodations_by_destination,
    get_accommodations_by_trip,
)


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    # Minimal required parent records
    user = models.User(email="t@test.com", hashed_password="x", role="user")
    session.add(user)
    session.flush()
    trip = models.Trip(
        user_id=user.id,
        name="Test Trip",
        start_date=date(2030, 6, 1),
        end_date=date(2030, 6, 10),
        status="planning",
    )
    session.add(trip)
    session.flush()
    dest = models.Destination(trip_id=trip.id, name="Paris", order=0)
    session.add(dest)
    session.flush()
    yield session, trip, dest
    session.close()


def _make_data(trip_id, dest_id, **kwargs):
    defaults = dict(
        destination_id=dest_id,
        trip_id=trip_id,
        name="Hotel du Nord",
        check_in_date=date(2030, 6, 1),
        check_out_date=date(2030, 6, 4),
    )
    defaults.update(kwargs)
    return schemas.AccommodationCreate(**defaults)


def test_create_without_cost_does_not_create_expense(db):
    session, trip, dest = db
    create_accommodation(session, _make_data(trip.id, dest.id))
    assert session.query(models.Expense).count() == 0


def test_create_with_cost_creates_expense(db):
    session, trip, dest = db
    acc = create_accommodation(
        session, _make_data(trip.id, dest.id, cost=150.0, currency="EUR")
    )
    expenses = session.query(models.Expense).filter_by(accommodation_id=acc.id).all()
    assert len(expenses) == 1
    exp = expenses[0]
    assert exp.category == "accommodation"
    assert float(exp.amount) == 150.0
    assert exp.currency == "EUR"
    assert exp.description == "Hotel du Nord"
    assert exp.date == date(2030, 6, 1)


def test_update_adding_cost_creates_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id))
    assert session.query(models.Expense).count() == 0
    update_accommodation(session, acc, schemas.AccommodationUpdate(cost=200.0))
    assert session.query(models.Expense).filter_by(accommodation_id=acc.id).count() == 1


def test_update_removing_cost_deletes_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    assert session.query(models.Expense).count() == 1
    update_accommodation(session, acc, schemas.AccommodationUpdate(cost=None))
    assert session.query(models.Expense).count() == 0


def test_update_cost_updates_existing_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    orig_expense_id = (
        session.query(models.Expense).filter_by(accommodation_id=acc.id).first().id
    )
    update_accommodation(session, acc, schemas.AccommodationUpdate(cost=250.0))
    expenses = session.query(models.Expense).filter_by(accommodation_id=acc.id).all()
    assert len(expenses) == 1
    assert expenses[0].id == orig_expense_id  # same expense updated, not a new one
    assert float(expenses[0].amount) == 250.0


def test_delete_removes_linked_expense(db):
    session, trip, dest = db
    acc = create_accommodation(session, _make_data(trip.id, dest.id, cost=100.0))
    assert session.query(models.Expense).count() == 1
    delete_accommodation(session, acc)
    assert session.query(models.Expense).count() == 0
    assert session.query(models.Accommodation).count() == 0


def test_get_by_destination(db):
    session, trip, dest = db
    create_accommodation(session, _make_data(trip.id, dest.id, name="A"))
    create_accommodation(session, _make_data(trip.id, dest.id, name="B"))
    results = get_accommodations_by_destination(session, dest.id)
    assert len(results) == 2


def test_get_by_trip(db):
    session, trip, dest = db
    create_accommodation(session, _make_data(trip.id, dest.id))
    results = get_accommodations_by_trip(session, trip.id)
    assert len(results) == 1
