from datetime import date
from app import models


def test_create_trip_day_with_destination(client, test_user, db_session):
    """Test creating a trip day linked to a destination"""
    db = db_session

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
        country="France",
        trip_id=trip.id,
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)

    payload = {
        "trip_id": trip.id,
        "date": "2030-01-01",
        "title": "First Day",
        "destination_id": dest.id,
    }
    resp = client.post("/trip-days/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["destination_id"] == dest.id


def test_update_trip_day_destination(client, test_user, db_session):
    """Test updating a trip day's destination"""
    db = db_session

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

    dest1 = models.Destination(name="Rome", trip_id=trip.id)
    dest2 = models.Destination(name="Florence", trip_id=trip.id)
    db.add_all([dest1, dest2])
    db.commit()
    db.refresh(dest1)
    db.refresh(dest2)

    day = models.TripDay(
        trip_id=trip.id,
        date=date(2030, 1, 1),
        destination_id=dest1.id,
    )
    db.add(day)
    db.commit()
    db.refresh(day)

    payload = {"destination_id": dest2.id}
    resp = client.patch(f"/trip-days/{day.id}", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["destination_id"] == dest2.id


def test_trip_day_destination_set_null_on_delete(client, test_user, db_session):
    """Test that deleting a destination sets destination_id to null on linked trip days"""
    db = db_session

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

    dest = models.Destination(name="Venice", trip_id=trip.id)
    db.add(dest)
    db.commit()
    db.refresh(dest)

    day = models.TripDay(
        trip_id=trip.id,
        date=date(2030, 1, 1),
        destination_id=dest.id,
    )
    db.add(day)
    db.commit()
    db.refresh(day)

    # Delete the destination via API
    resp = client.delete(f"/destinations/{dest.id}")
    assert resp.status_code == 204

    # Verify day still exists and destination_id is null
    db.refresh(day)
    assert day.destination_id is None
