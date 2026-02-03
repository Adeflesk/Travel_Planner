from datetime import date
from decimal import Decimal

from app.core.security import create_access_token
from app import models


def create_user_and_token(db, email="other@example.com"):
    user = models.User(
        email=email, hashed_password="x", full_name="Other", is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return user, token


def test_create_expense(client, test_user, testing_session_local):
    """Test creating an expense"""
    db = testing_session_local()

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Paris",
        trip_id=trip.id,
        country="France",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    payload = {
        "amount": "50.00",
        "currency": "EUR",
        "category": "food",
        "description": "Dinner",
        "date": "2030-01-02",
        "trip_id": trip.id,
        "destination_id": dest.id,
    }
    resp = client.post("/expenses/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert float(data["amount"]) == 50.0
    assert data["category"] == "food"
    assert data["destination_id"] == dest.id


def test_create_expense_non_owner_forbidden(client, test_user, testing_session_local):
    """Test non-owner cannot create expense"""
    db = testing_session_local()

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Rome",
        trip_id=trip.id,
        country="Italy",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()
    db.refresh(dest)

    payload = {
        "amount": "100.00",
        "currency": "EUR",
        "category": "lodging",
        "date": "2030-01-02",
        "trip_id": trip.id,
        "destination_id": dest.id,
    }
    resp = client.post("/expenses/", json=payload)
    assert resp.status_code == 404


def test_get_destination_expenses(client, test_user, testing_session_local):
    """Test listing expenses for a destination"""
    db = testing_session_local()

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="London",
        trip_id=trip.id,
        country="UK",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    exp1 = models.Expense(
        amount=Decimal("25.00"),
        currency="GBP",
        category="food",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 2),
    )
    exp2 = models.Expense(
        amount=Decimal("100.00"),
        currency="GBP",
        category="transport",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 3),
    )
    db.add_all([exp1, exp2])
    db.commit()

    resp = client.get(f"/trips/{trip.id}/expenses/")
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.json()}"
    expenses = resp.json()
    assert len(expenses) == 2


def test_get_destination_expenses_not_found(client, test_user):
    """Test 404 for non-existent trip"""
    resp = client.get("/trips/99999/expenses/")
    assert resp.status_code == 404


def test_update_expense(client, test_user, testing_session_local):
    """Test updating an expense"""
    db = testing_session_local()

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Barcelona",
        trip_id=trip.id,
        country="Spain",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    exp = models.Expense(
        amount=Decimal("50.00"),
        currency="EUR",
        category="food",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 2),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    payload = {"amount": "75.00", "category": "entertainment"}
    resp = client.put(f"/expenses/{exp.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["amount"]) == 75.0
    assert data["category"] == "entertainment"


def test_update_expense_non_owner_forbidden(client, test_user, testing_session_local):
    """Test non-owner cannot update expense"""
    db = testing_session_local()

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Madrid",
        trip_id=trip.id,
        country="Spain",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    exp = models.Expense(
        amount=Decimal("40.00"),
        currency="EUR",
        category="food",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 2),
    )
    db.add(exp)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    payload = {"amount": "50.00"}
    resp = client.put(f"/expenses/{exp.id}", json=payload)
    assert resp.status_code == 404


def test_update_expense_not_found(client, test_user):
    """Test 404 for updating non-existent expense"""
    payload = {"amount": "10.00"}
    resp = client.put("/expenses/99999", json=payload)
    assert resp.status_code == 404


def test_delete_expense(client, test_user, testing_session_local):
    """Test deleting an expense"""
    db = testing_session_local()

    trip = models.Trip(
        name="TestTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=test_user["user"].id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Berlin",
        trip_id=trip.id,
        country="Germany",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    exp = models.Expense(
        amount=Decimal("30.00"),
        currency="EUR",
        category="transport",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 2),
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    exp_id = exp.id

    resp = client.delete(f"/expenses/{exp_id}")
    assert resp.status_code == 204

    deleted_exp = db.query(models.Expense).filter(models.Expense.id == exp_id).first()
    assert deleted_exp is None


def test_delete_expense_non_owner_forbidden(client, test_user, testing_session_local):
    """Test non-owner cannot delete expense"""
    db = testing_session_local()

    other, _ = create_user_and_token(db, "owner@example.com")
    trip = models.Trip(
        name="OtherTrip",
        description="x",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 10),
        budget=1000,
        status="planning",
        user_id=other.id,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    dest = models.Destination(
        name="Vienna",
        trip_id=trip.id,
        country="Austria",
        arrival_date=date(2030, 1, 1),
        departure_date=date(2030, 1, 5),
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    exp = models.Expense(
        amount=Decimal("20.00"),
        currency="EUR",
        category="food",
        destination_id=dest.id,
        trip_id=trip.id,
        date=date(2030, 1, 2),
    )
    db.add(exp)

    share = models.TripShare(
        trip_id=trip.id, user_id=test_user["user"].id, permission="view"
    )
    db.add(share)
    db.commit()

    resp = client.delete(f"/expenses/{exp.id}")
    assert resp.status_code == 404


def test_delete_expense_not_found(client, test_user):
    """Test 404 for deleting non-existent expense"""
    resp = client.delete("/expenses/99999")
    assert resp.status_code == 404
