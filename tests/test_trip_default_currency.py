from datetime import date
from app import models


def test_trip_default_currency_in_response(client, test_user, db_session):
    trip = models.Trip(
        name="Currency Trip",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 5),
        status="planning",
        user_id=test_user["user"].id,
        default_currency="EUR",
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    resp = client.get(f"/trips/{trip.id}")
    assert resp.status_code == 200
    assert resp.json()["default_currency"] == "EUR"


def test_trip_create_with_default_currency(client, test_user):
    payload = {
        "name": "EUR Trip",
        "start_date": "2030-03-01",
        "end_date": "2030-03-10",
        "default_currency": "EUR",
    }
    resp = client.post("/trips/", json=payload)
    assert resp.status_code == 201
    assert resp.json()["default_currency"] == "EUR"


def test_trip_update_default_currency(client, test_user, db_session):
    trip = models.Trip(
        name="Update Currency",
        start_date=date(2030, 1, 1),
        end_date=date(2030, 1, 5),
        status="planning",
        user_id=test_user["user"].id,
    )
    db_session.add(trip)
    db_session.commit()
    db_session.refresh(trip)

    resp = client.put(f"/trips/{trip.id}", json={"default_currency": "GBP"})
    assert resp.status_code == 200
    assert resp.json()["default_currency"] == "GBP"
