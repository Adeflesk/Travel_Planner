# test_main.py
from datetime import date, datetime, timedelta

import pytest

# Tests now explicitly request `client` and `db_setup` fixtures from `conftest.py`.


@pytest.fixture
def sample_trip_data():
    """Sample trip data for testing"""
    today = date.today()
    return {
        "name": "Test Trip to Paris",
        "description": "A wonderful vacation",
        "start_date": str(today),
        "end_date": str(today + timedelta(days=7)),
        "budget": 5000.00,
        "status": "planning",
    }


@pytest.fixture
def created_trip(client, db_setup, sample_trip_data):
    """Create a trip and return its data"""
    response = client.post("/trips/", json=sample_trip_data)
    return response.json()


# ==================== TRIP TESTS ====================


def test_create_trip(client, db_setup, sample_trip_data):
    """Test creating a new trip"""
    response = client.post("/trips/", json=sample_trip_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == sample_trip_data["name"]
    assert float(data["budget"]) == sample_trip_data["budget"]
    assert "id" in data
    assert "created_at" in data


def test_create_trip_missing_required_fields(client, db_setup):
    """Test creating trip without required fields"""
    response = client.post(
        "/trips/",
        json={
            "name": "Incomplete Trip"
            # Missing start_date and end_date
        },
    )
    assert response.status_code == 422  # Validation error


def test_get_all_trips(client, db_setup, created_trip):
    """Test getting all trips"""
    response = client.get("/trips/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == created_trip["name"]


def test_get_trip_by_id(client, db_setup, created_trip):
    """Test getting a specific trip by ID"""
    trip_id = created_trip["id"]
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == trip_id
    assert data["name"] == created_trip["name"]


def test_get_nonexistent_trip(client, db_setup):
    """Test getting a trip that doesn't exist"""
    response = client.get("/trips/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_update_trip(client, db_setup, created_trip):
    """Test updating a trip"""
    trip_id = created_trip["id"]
    update_data = {"name": "Updated Trip Name", "status": "booked"}
    response = client.put(f"/trips/{trip_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Trip Name"
    assert data["status"] == "booked"


def test_delete_trip(client, db_setup, created_trip):
    """Test deleting a trip"""
    trip_id = created_trip["id"]
    response = client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # Verify trip is deleted
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 404


# ==================== DESTINATION TESTS ====================


def test_create_destination(client, db_setup, created_trip):
    """Test creating a destination"""
    destination_data = {
        "trip_id": created_trip["id"],
        "name": "Paris",
        "country": "France",
        "region": "Île-de-France",
        "arrival_date": created_trip["start_date"],
        "departure_date": created_trip["end_date"],
    }
    response = client.post("/destinations/", json=destination_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Paris"
    assert data["country"] == "France"
    assert data["region"] == "Île-de-France"
    assert data["trip_id"] == created_trip["id"]


def test_create_destination_invalid_trip(client, db_setup):
    """Test creating destination with non-existent trip"""
    destination_data = {"trip_id": 99999, "name": "Paris", "country": "France"}
    response = client.post("/destinations/", json=destination_data)
    assert response.status_code == 404


def test_get_trip_destinations(client, db_setup, created_trip):
    """Test getting all destinations for a trip"""
    # Create multiple destinations
    for city in ["Paris", "London", "Rome"]:
        client.post(
            "/destinations/",
            json={
                "trip_id": created_trip["id"],
                "name": city,
                "country": "Test Country",
            },
        )

    response = client.get(f"/trips/{created_trip['id']}/destinations/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert any(d["name"] == "Paris" for d in data)


def test_update_destination(client, db_setup, created_trip):
    """Test updating a destination"""
    # Create destination
    dest_response = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Paris",
            "country": "France",
            "region": "Île-de-France",
        },
    )
    dest_id = dest_response.json()["id"]

    # Update it
    update_data = {"region": "Paris Region", "notes": "City of lights"}
    response = client.put(f"/destinations/{dest_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["region"] == "Paris Region"
    assert response.json()["notes"] == "City of lights"


def test_delete_destination(client, db_setup, created_trip):
    """Test deleting a destination"""
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    response = client.delete(f"/destinations/{dest_id}")
    assert response.status_code == 204


# ==================== ACTIVITY TESTS ====================


def test_create_activity(client, db_setup, created_trip):
    """Test creating an activity"""
    # Create destination first
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create activity
    activity_data = {
        "destination_id": dest_id,
        "name": "Visit Eiffel Tower",
        "activity_type": "sightseeing",
        "cost": 25.50,
    }
    response = client.post("/activities/", json=activity_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Visit Eiffel Tower"
    assert float(data["cost"]) == activity_data["cost"]


def test_get_destination_activities(client, db_setup, created_trip):
    """Test getting all activities for a destination"""
    # Create destination
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create activities
    for activity in ["Eiffel Tower", "Louvre Museum"]:
        client.post("/activities/", json={"destination_id": dest_id, "name": activity})

    response = client.get(f"/destinations/{dest_id}/activities/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_create_todo_activity(client, db_setup, created_trip):
    """Test creating a todo activity"""
    # Create destination
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create todo activity
    activity_data = {
        "destination_id": dest_id,
        "name": "Pack passport",
        "is_todo": True,
        "is_completed": False,
    }
    response = client.post("/activities/", json=activity_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Pack passport"
    assert data["is_todo"] is True
    assert data["is_completed"] is False


def test_complete_todo_activity(client, db_setup, created_trip):
    """Test marking a todo activity as completed"""
    # Create destination
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create todo
    activity_response = client.post(
        "/activities/",
        json={
            "destination_id": dest_id,
            "name": "Book hotel",
            "is_todo": True,
            "is_completed": False,
        },
    )
    activity_id = activity_response.json()["id"]

    # Mark as completed
    response = client.put(f"/activities/{activity_id}", json={"is_completed": True})
    assert response.status_code == 200
    assert response.json()["is_completed"] is True
    assert response.json()["is_todo"] is True


def test_scheduled_vs_todo_activities(client, db_setup, created_trip):
    """Test difference between scheduled and todo activities"""
    # Create destination
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create scheduled activity
    scheduled = client.post(
        "/activities/",
        json={
            "destination_id": dest_id,
            "name": "Louvre Tour",
            "scheduled_date": created_trip["start_date"],
            "is_todo": False,
        },
    ).json()

    # Create todo
    todo = client.post(
        "/activities/",
        json={
            "destination_id": dest_id,
            "name": "Buy souvenirs",
            "is_todo": True,
            "is_completed": False,
        },
    ).json()

    # Verify differences
    assert scheduled["is_todo"] is False
    assert scheduled["is_completed"] is False
    assert todo["is_todo"] is True
    assert todo["scheduled_date"] is None


# ==================== EXPENSE TESTS ====================


def test_create_expense(client, db_setup, created_trip):
    """Test creating an expense"""
    expense_data = {
        "trip_id": created_trip["id"],
        "category": "food",
        "amount": 45.50,
        "description": "Dinner at restaurant",
        "date": created_trip["start_date"],
        "currency": "USD",
        "booked": True,
        "paid": False,
    }
    response = client.post("/expenses/", json=expense_data)
    assert response.status_code == 201
    data = response.json()
    assert float(data["amount"]) == expense_data["amount"]
    assert data["category"] == "food"
    assert data["booked"] is True
    assert data["paid"] is False


def test_get_trip_expenses(client, db_setup, created_trip):
    """Test getting all expenses for a trip"""
    # Create multiple expenses
    expenses = [
        {
            "category": "food",
            "amount": 50,
            "description": "Lunch",
            "date": created_trip["start_date"],
            "booked": True,
            "paid": True,
        },
        {
            "category": "transport",
            "amount": 30,
            "description": "Taxi",
            "date": created_trip["start_date"],
            "booked": False,
            "paid": False,
        },
    ]

    for exp in expenses:
        exp["trip_id"] = created_trip["id"]
        client.post("/expenses/", json=exp)

    response = client.get(f"/trips/{created_trip['id']}/expenses/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    total = sum(float(e["amount"]) for e in data)
    assert total == 80
    # Check booked/paid status
    assert any(e["booked"] and e["paid"] for e in data)
    assert any(not e["booked"] and not e["paid"] for e in data)


def test_update_expense_status(client, db_setup, created_trip):
    """Test updating expense booked/paid status"""
    exp_response = client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "category": "food",
            "amount": 25,
            "date": created_trip["start_date"],
            "booked": False,
            "paid": False,
        },
    )
    exp_id = exp_response.json()["id"]

    # Update to booked
    response = client.put(f"/expenses/{exp_id}", json={"booked": True})
    assert response.status_code == 200
    assert response.json()["booked"] is True
    assert response.json()["paid"] is False

    # Update to paid
    response = client.put(f"/expenses/{exp_id}", json={"paid": True})
    assert response.status_code == 200
    assert response.json()["booked"] is True
    assert response.json()["paid"] is True


def test_link_accommodation_expense_to_destination(client, db_setup, created_trip):
    """Test linking accommodation expenses to a destination"""
    # Create destination with dates
    dest_response = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Paris",
            "arrival_date": created_trip["start_date"],
            "departure_date": created_trip["end_date"],
        },
    )
    dest_id = dest_response.json()["id"]

    # Test 1: Manual link (destination_id explicitly set)
    expense_manual = {
        "trip_id": created_trip["id"],
        "destination_id": dest_id,
        "category": "accommodation",
        "amount": 150.00,
        "description": "Hotel du Louvre",
        "date": created_trip["start_date"],
        "booked": True,
        "paid": False,
    }
    response = client.post("/expenses/", json=expense_manual)
    assert response.status_code == 201
    data = response.json()
    assert data["destination_id"] == dest_id
    assert data["category"] == "accommodation"
    assert data["booked"] is True

    # Test 2: Auto-link by date (no destination_id set, but date within range)
    # Frontend will auto-link this expense based on date matching
    expense_auto = {
        "trip_id": created_trip["id"],
        "category": "accommodation",
        "amount": 200.00,
        "description": "Airbnb Paris",
        "date": created_trip["start_date"],
        "booked": False,
        "paid": False,
    }
    response = client.post("/expenses/", json=expense_auto)
    assert response.status_code == 201
    data = response.json()
    assert data["destination_id"] is None  # Backend doesn't set it
    assert data["category"] == "accommodation"

    # Verify both expenses exist
    expenses_response = client.get(f"/trips/{created_trip['id']}/expenses/")
    expenses = expenses_response.json()
    accommodation_expenses = [e for e in expenses if e["category"] == "accommodation"]
    assert len(accommodation_expenses) == 2


def test_expense_with_cancel_by_date(client, db_setup, created_trip):
    """Test creating expense with cancel_by_date"""
    cancel_date = (
        datetime.strptime(created_trip["start_date"], "%Y-%m-%d") + timedelta(days=-7)
    ).strftime("%Y-%m-%d")

    expense_data = {
        "trip_id": created_trip["id"],
        "category": "accommodation",
        "amount": 150.00,
        "description": "Hotel booking",
        "date": created_trip["start_date"],
        "booked": True,
        "paid": False,
        "cancel_by_date": cancel_date,
    }
    response = client.post("/expenses/", json=expense_data)
    assert response.status_code == 201
    data = response.json()
    assert data["cancel_by_date"] == cancel_date
    assert data["booked"] is True
    assert data["paid"] is False


def test_update_expense_cancel_by_date(client, db_setup, created_trip):
    """Test updating cancel_by_date on an existing expense"""
    # First create an expense without cancel_by_date
    expense_data = {
        "trip_id": created_trip["id"],
        "category": "accommodation",
        "amount": 200.00,
        "description": "Hotel booking",
        "date": created_trip["start_date"],
        "booked": True,
        "paid": False,
    }
    create_response = client.post("/expenses/", json=expense_data)
    assert create_response.status_code == 201
    expense_id = create_response.json()["id"]
    assert create_response.json()["cancel_by_date"] is None

    # Now update with cancel_by_date
    new_cancel_date = "2026-09-01"
    update_response = client.put(
        f"/expenses/{expense_id}", json={"cancel_by_date": new_cancel_date}
    )
    print(f"Update response status: {update_response.status_code}")
    print(f"Update response body: {update_response.json()}")
    assert update_response.status_code == 200
    assert update_response.json()["cancel_by_date"] == new_cancel_date


def test_update_expense_date_field(client, db_setup, created_trip):
    """Test updating the date field on an existing expense"""
    # Create an expense
    expense_data = {
        "trip_id": created_trip["id"],
        "category": "food",
        "amount": 50.00,
        "date": created_trip["start_date"],
    }
    create_response = client.post("/expenses/", json=expense_data)
    assert create_response.status_code == 201
    expense_id = create_response.json()["id"]

    # Update the date
    new_date = "2026-09-15"
    update_response = client.put(f"/expenses/{expense_id}", json={"date": new_date})
    print(f"Update response status: {update_response.status_code}")
    print(f"Update response body: {update_response.json()}")
    assert update_response.status_code == 200
    assert update_response.json()["date"] == new_date


def test_delete_expense(client, db_setup, created_trip):
    """Test deleting an expense"""
    exp_response = client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "category": "food",
            "amount": 25,
            "date": created_trip["start_date"],
        },
    )
    exp_id = exp_response.json()["id"]

    response = client.delete(f"/expenses/{exp_id}")
    assert response.status_code == 204


# ==================== PACKING ITEM TESTS ====================


def test_create_packing_item(client, db_setup, created_trip):
    """Test creating a packing item"""
    item_data = {
        "trip_id": created_trip["id"],
        "item_name": "Passport",
        "category": "documents",
        "quantity": 1,
    }
    response = client.post("/packing-items/", json=item_data)
    assert response.status_code == 201
    data = response.json()
    assert data["item_name"] == "Passport"
    assert data["is_packed"] is False


def test_get_trip_packing_items(client, db_setup, created_trip):
    """Test getting packing list for a trip"""
    items = ["Passport", "Sunglasses", "Camera"]
    for item in items:
        client.post(
            "/packing-items/", json={"trip_id": created_trip["id"], "item_name": item}
        )

    response = client.get(f"/trips/{created_trip['id']}/packing-items/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_update_packing_item_packed_status(client, db_setup, created_trip):
    """Test marking item as packed"""
    item_response = client.post(
        "/packing-items/", json={"trip_id": created_trip["id"], "item_name": "Passport"}
    )
    item_id = item_response.json()["id"]

    response = client.put(f"/packing-items/{item_id}", json={"is_packed": True})
    assert response.status_code == 200
    assert response.json()["is_packed"] is True


# ==================== EXPENSE SUMMARY TESTS ====================


def test_expense_summary_empty(client, db_setup, created_trip):
    """Test expense summary with no expenses"""
    response = client.get(f"/trips/{created_trip['id']}/expenses/summary/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["paid_total"] == 0
    assert data["unpaid_total"] == 0
    assert data["by_category"] == {}
    assert data["count"] == 0


def test_expense_summary_with_expenses(client, db_setup, created_trip):
    """Test expense summary with multiple expenses"""
    expenses = [
        {
            "trip_id": created_trip["id"],
            "category": "food",
            "amount": 50.00,
            "date": created_trip["start_date"],
            "paid": True,
        },
        {
            "trip_id": created_trip["id"],
            "category": "food",
            "amount": 30.00,
            "date": created_trip["start_date"],
            "paid": False,
        },
        {
            "trip_id": created_trip["id"],
            "category": "transport",
            "amount": 100.00,
            "date": created_trip["start_date"],
            "paid": True,
        },
        {
            "trip_id": created_trip["id"],
            "category": "accommodation",
            "amount": 200.00,
            "date": created_trip["start_date"],
            "paid": False,
        },
    ]

    for exp in expenses:
        client.post("/expenses/", json=exp)

    response = client.get(f"/trips/{created_trip['id']}/expenses/summary/")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 380.00
    assert data["paid_total"] == 150.00
    assert data["unpaid_total"] == 230.00
    assert data["count"] == 4
    assert data["by_category"]["food"] == 80.00
    assert data["by_category"]["transport"] == 100.00
    assert data["by_category"]["accommodation"] == 200.00


def test_expense_summary_nonexistent_trip(client, db_setup):
    """Test expense summary for nonexistent trip"""
    response = client.get("/trips/99999/expenses/summary/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== PACKING SUMMARY TESTS ====================


def test_packing_summary_empty(client, db_setup, created_trip):
    """Test packing summary with no items"""
    response = client.get(f"/trips/{created_trip['id']}/packing/summary/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_items"] == 0
    assert data["packed_items"] == 0
    assert data["progress_percent"] == 0
    assert data["by_category"] == {}


def test_packing_summary_with_items(client, db_setup, created_trip):
    """Test packing summary with multiple items"""
    items = [
        {"trip_id": created_trip["id"], "item_name": "T-Shirt", "category": "clothing"},
        {"trip_id": created_trip["id"], "item_name": "Jeans", "category": "clothing"},
        {
            "trip_id": created_trip["id"],
            "item_name": "Passport",
            "category": "documents",
        },
        {
            "trip_id": created_trip["id"],
            "item_name": "Toothbrush",
            "category": "toiletries",
        },
    ]

    item_ids = []
    for item in items:
        response = client.post("/packing-items/", json=item)
        item_ids.append(response.json()["id"])

    # Mark some items as packed
    client.put(f"/packing-items/{item_ids[0]}", json={"is_packed": True})
    client.put(f"/packing-items/{item_ids[2]}", json={"is_packed": True})

    response = client.get(f"/trips/{created_trip['id']}/packing/summary/")
    assert response.status_code == 200
    data = response.json()

    assert data["total_items"] == 4
    assert data["packed_items"] == 2
    assert data["progress_percent"] == 50

    # Check category breakdown
    assert "clothing" in data["by_category"]
    assert data["by_category"]["clothing"]["total"] == 2
    assert data["by_category"]["clothing"]["packed"] == 1

    assert "documents" in data["by_category"]
    assert data["by_category"]["documents"]["total"] == 1
    assert data["by_category"]["documents"]["packed"] == 1

    assert "toiletries" in data["by_category"]
    assert data["by_category"]["toiletries"]["total"] == 1
    assert data["by_category"]["toiletries"]["packed"] == 0


def test_packing_summary_nonexistent_trip(client, db_setup):
    """Test packing summary for nonexistent trip"""
    response = client.get("/trips/99999/packing/summary/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== TRIP PROGRESS TESTS ====================


def test_trip_progress_empty(client, db_setup, created_trip):
    """Test trip progress with no activities"""
    response = client.get(f"/trips/{created_trip['id']}/progress/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_activities"] == 0
    assert data["completed_activities"] == 0
    assert data["progress_percent"] == 0


def test_trip_progress_with_activities(client, db_setup, created_trip):
    """Test trip progress with multiple activities"""
    # Create destination
    dest_response = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Paris"},
    )
    dest_id = dest_response.json()["id"]

    # Create activities
    activities = [
        {"destination_id": dest_id, "name": "Visit Eiffel Tower", "is_completed": True},
        {"destination_id": dest_id, "name": "Visit Louvre", "is_completed": True},
        {"destination_id": dest_id, "name": "Seine Cruise", "is_completed": False},
        {"destination_id": dest_id, "name": "Arc de Triomphe", "is_completed": False},
    ]

    for act in activities:
        client.post("/activities/", json=act)

    response = client.get(f"/trips/{created_trip['id']}/progress/")
    assert response.status_code == 200
    data = response.json()

    assert data["total_activities"] == 4
    assert data["completed_activities"] == 2
    assert data["progress_percent"] == 50


def test_trip_progress_nonexistent_trip(client, db_setup):
    """Test trip progress for nonexistent trip"""
    response = client.get("/trips/99999/progress/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== DESTINATIONS WITH ACTIVITIES TESTS ====================


def test_destinations_with_activities_empty(client, db_setup, created_trip):
    """Test destinations with activities with no destinations"""
    response = client.get(f"/trips/{created_trip['id']}/destinations-with-activities/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


def test_destinations_with_activities(client, db_setup, created_trip):
    """Test destinations with activities returns nested data"""
    # Create destinations
    dest1 = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Paris", "order": 0},
    ).json()

    dest2 = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "London", "order": 1},
    ).json()

    # Create activities for each destination
    client.post(
        "/activities/",
        json={"destination_id": dest1["id"], "name": "Eiffel Tower"},
    )
    client.post(
        "/activities/",
        json={"destination_id": dest1["id"], "name": "Louvre"},
    )
    client.post(
        "/activities/",
        json={"destination_id": dest2["id"], "name": "Big Ben"},
    )

    response = client.get(f"/trips/{created_trip['id']}/destinations-with-activities/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2

    # Check first destination (Paris)
    assert data[0]["destination"]["name"] == "Paris"
    assert len(data[0]["activities"]) == 2
    activity_names = [a["name"] for a in data[0]["activities"]]
    assert "Eiffel Tower" in activity_names
    assert "Louvre" in activity_names

    # Check second destination (London)
    assert data[1]["destination"]["name"] == "London"
    assert len(data[1]["activities"]) == 1
    assert data[1]["activities"][0]["name"] == "Big Ben"


def test_destinations_with_activities_nonexistent_trip(client, db_setup):
    """Test destinations with activities for nonexistent trip"""
    response = client.get("/trips/99999/destinations-with-activities/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== TIMELINE TESTS ====================


def test_timeline_empty(client, db_setup, created_trip):
    """Test timeline with no destinations or journeys"""
    response = client.get(f"/trips/{created_trip['id']}/timeline/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


def test_timeline_with_data(client, db_setup, created_trip):
    """Test timeline merges and sorts destinations and journeys"""
    # Create destinations with dates
    dest1 = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Paris",
            "arrival_date": created_trip["start_date"],
        },
    ).json()

    dest2 = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "London",
            "arrival_date": created_trip["end_date"],
        },
    ).json()

    # Create journey between them (mid-trip date)
    journey_date = (
        datetime.strptime(created_trip["start_date"], "%Y-%m-%d") + timedelta(days=3)
    ).strftime("%Y-%m-%d")
    client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "origin_id": dest1["id"],
            "destination_id": dest2["id"],
            "transport_mode": "train",
            "departure_datetime": f"{journey_date}T10:00:00",
        },
    )

    response = client.get(f"/trips/{created_trip['id']}/timeline/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 3

    # Verify sorting: Paris (start_date) -> Journey (mid) -> London (end_date)
    assert data[0]["type"] == "destination"
    assert data[0]["destination"]["name"] == "Paris"
    assert data[1]["type"] == "journey"
    assert data[1]["journey"]["transport_mode"] == "train"
    assert data[2]["type"] == "destination"
    assert data[2]["destination"]["name"] == "London"


def test_timeline_items_without_dates(client, db_setup, created_trip):
    """Test timeline handles items without dates"""
    # Create destination without date
    client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Undated City"},
    )

    # Create destination with date
    client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Dated City",
            "arrival_date": created_trip["start_date"],
        },
    )

    response = client.get(f"/trips/{created_trip['id']}/timeline/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    # Items without dates should come first
    assert data[0]["destination"]["name"] == "Undated City"
    assert data[1]["destination"]["name"] == "Dated City"


def test_timeline_nonexistent_trip(client, db_setup):
    """Test timeline for nonexistent trip"""
    response = client.get("/trips/99999/timeline/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== ACCOMMODATION EXPENSES TESTS ====================


def test_accommodation_expenses_empty(client, db_setup, created_trip):
    """Test accommodation expenses with no destinations"""
    response = client.get(f"/trips/{created_trip['id']}/accommodation-expenses/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


def test_accommodation_expenses_manual_link(client, db_setup, created_trip):
    """Test accommodation expenses with manual destination link"""
    # Create destination
    dest = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Paris",
            "arrival_date": created_trip["start_date"],
            "departure_date": created_trip["end_date"],
        },
    ).json()

    # Create accommodation expense linked to destination
    client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "destination_id": dest["id"],
            "category": "accommodation",
            "amount": 150.00,
            "date": created_trip["start_date"],
            "description": "Hotel Paris",
        },
    )

    response = client.get(f"/trips/{created_trip['id']}/accommodation-expenses/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["destination"]["name"] == "Paris"
    assert len(data[0]["expenses"]) == 1
    assert float(data[0]["expenses"][0]["amount"]) == 150.00
    assert data[0]["total"] == 150.00


def test_accommodation_expenses_auto_link_by_date(client, db_setup, created_trip):
    """Test accommodation expenses auto-linked by date range"""
    # Create destination with date range
    client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "London",
            "arrival_date": created_trip["start_date"],
            "departure_date": created_trip["end_date"],
        },
    )

    # Create accommodation expense without destination_id but within date range
    exp_date = (
        datetime.strptime(created_trip["start_date"], "%Y-%m-%d") + timedelta(days=1)
    ).strftime("%Y-%m-%d")
    client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "category": "accommodation",
            "amount": 200.00,
            "date": exp_date,
            "description": "Airbnb London",
        },
    )

    response = client.get(f"/trips/{created_trip['id']}/accommodation-expenses/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["destination"]["name"] == "London"
    assert len(data[0]["expenses"]) == 1
    assert data[0]["total"] == 200.00


def test_accommodation_expenses_multiple_destinations(client, db_setup, created_trip):
    """Test accommodation expenses across multiple destinations"""
    # Create two destinations
    dest1 = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "Paris",
            "arrival_date": created_trip["start_date"],
            "departure_date": (
                datetime.strptime(created_trip["start_date"], "%Y-%m-%d")
                + timedelta(days=3)
            ).strftime("%Y-%m-%d"),
            "order": 0,
        },
    ).json()

    dest2 = client.post(
        "/destinations/",
        json={
            "trip_id": created_trip["id"],
            "name": "London",
            "arrival_date": (
                datetime.strptime(created_trip["start_date"], "%Y-%m-%d")
                + timedelta(days=3)
            ).strftime("%Y-%m-%d"),
            "departure_date": created_trip["end_date"],
            "order": 1,
        },
    ).json()

    # Create expenses for each destination
    client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "destination_id": dest1["id"],
            "category": "accommodation",
            "amount": 100.00,
            "date": created_trip["start_date"],
        },
    )
    client.post(
        "/expenses/",
        json={
            "trip_id": created_trip["id"],
            "destination_id": dest2["id"],
            "category": "accommodation",
            "amount": 150.00,
            "date": (
                datetime.strptime(created_trip["start_date"], "%Y-%m-%d")
                + timedelta(days=4)
            ).strftime("%Y-%m-%d"),
        },
    )

    response = client.get(f"/trips/{created_trip['id']}/accommodation-expenses/")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    assert data[0]["destination"]["name"] == "Paris"
    assert data[0]["total"] == 100.00
    assert data[1]["destination"]["name"] == "London"
    assert data[1]["total"] == 150.00


def test_accommodation_expenses_nonexistent_trip(client, db_setup):
    """Test accommodation expenses for nonexistent trip"""
    response = client.get("/trips/99999/accommodation-expenses/")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


# ==================== INTEGRATION TESTS ====================


def test_cascade_delete_trip_with_data(client, db_setup, created_trip):
    """Test that deleting a trip deletes all related data"""
    trip_id = created_trip["id"]

    # Create destination
    dest_response = client.post(
        "/destinations/", json={"trip_id": trip_id, "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    # Create expense
    client.post(
        "/expenses/",
        json={
            "trip_id": trip_id,
            "category": "food",
            "amount": 50,
            "date": created_trip["start_date"],
        },
    )

    # Create packing item
    client.post("/packing-items/", json={"trip_id": trip_id, "item_name": "Passport"})

    # Delete trip
    response = client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # Verify all related data is deleted
    assert client.get(f"/destinations/{dest_id}").status_code == 404
    expenses_response = client.get(f"/trips/{trip_id}/expenses/")
    assert len(expenses_response.json()) == 0 or expenses_response.status_code == 404


def test_root_endpoint(client, db_setup):
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["version"] == "1.0.0"


# ==================== JOURNEY TESTS ====================


def test_create_journey(client, db_setup, created_trip):
    """Test creating a journey"""
    # Create two destinations
    dest1_response = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Paris", "country": "France"},
    )
    dest2_response = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "London", "country": "UK"},
    )
    dest1_id = dest1_response.json()["id"]
    dest2_id = dest2_response.json()["id"]

    journey_data = {
        "trip_id": created_trip["id"],
        "origin_id": dest1_id,
        "destination_id": dest2_id,
        "transport_mode": "train",
        "departure_datetime": f"{created_trip['start_date']}T10:00:00",
        "arrival_datetime": f"{created_trip['start_date']}T12:30:00",
        "carrier": "Eurostar",
        "booking_reference": "EUR123",
        "cost": 150.00,
        "currency": "GBP",
        "status": "booked",
    }
    response = client.post("/journeys/", json=journey_data)
    assert response.status_code == 201
    data = response.json()
    assert data["transport_mode"] == "train"
    assert data["carrier"] == "Eurostar"
    assert data["origin_id"] == dest1_id
    assert data["destination_id"] == dest2_id
    assert float(data["cost"]) == 150.00
    assert data["status"] == "booked"


def test_create_journey_minimal(client, db_setup, created_trip):
    """Test creating a journey with minimal data"""
    journey_data = {
        "trip_id": created_trip["id"],
        "transport_mode": "flight",
    }
    response = client.post("/journeys/", json=journey_data)
    assert response.status_code == 201
    data = response.json()
    assert data["transport_mode"] == "flight"
    assert data["status"] == "planned"
    assert data["currency"] == "USD"


def test_create_journey_invalid_trip(client, db_setup):
    """Test creating journey with non-existent trip"""
    journey_data = {
        "trip_id": 99999,
        "transport_mode": "flight",
    }
    response = client.post("/journeys/", json=journey_data)
    assert response.status_code == 404


def test_get_trip_journeys(client, db_setup, created_trip):
    """Test getting all journeys for a trip"""
    # Create multiple journeys
    transport_modes = ["flight", "train", "bus"]
    for mode in transport_modes:
        client.post(
            "/journeys/",
            json={
                "trip_id": created_trip["id"],
                "transport_mode": mode,
            },
        )

    response = client.get(f"/trips/{created_trip['id']}/journeys/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    modes = [j["transport_mode"] for j in data]
    assert "flight" in modes
    assert "train" in modes
    assert "bus" in modes


def test_get_journey_by_id(client, db_setup, created_trip):
    """Test getting a specific journey by ID"""
    journey_response = client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "transport_mode": "ferry",
            "carrier": "P&O Ferries",
        },
    )
    journey_id = journey_response.json()["id"]

    response = client.get(f"/journeys/{journey_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == journey_id
    assert data["transport_mode"] == "ferry"
    assert data["carrier"] == "P&O Ferries"


def test_get_nonexistent_journey(client, db_setup):
    """Test getting a journey that doesn't exist"""
    response = client.get("/journeys/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Journey not found"


def test_update_journey(client, db_setup, created_trip):
    """Test updating a journey"""
    journey_response = client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "transport_mode": "flight",
            "status": "planned",
        },
    )
    journey_id = journey_response.json()["id"]

    update_data = {
        "carrier": "British Airways",
        "booking_reference": "BA456",
        "cost": 350.00,
        "status": "booked",
    }
    response = client.put(f"/journeys/{journey_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["carrier"] == "British Airways"
    assert data["booking_reference"] == "BA456"
    assert float(data["cost"]) == 350.00
    assert data["status"] == "booked"


def test_update_journey_datetime(client, db_setup, created_trip):
    """Test updating journey departure and arrival times"""
    journey_response = client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "transport_mode": "train",
        },
    )
    journey_id = journey_response.json()["id"]

    update_data = {
        "departure_datetime": f"{created_trip['start_date']}T08:00:00",
        "arrival_datetime": f"{created_trip['start_date']}T11:30:00",
    }
    response = client.put(f"/journeys/{journey_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert created_trip["start_date"] in data["departure_datetime"]
    assert created_trip["start_date"] in data["arrival_datetime"]


def test_delete_journey(client, db_setup, created_trip):
    """Test deleting a journey"""
    journey_response = client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "transport_mode": "car",
        },
    )
    journey_id = journey_response.json()["id"]

    response = client.delete(f"/journeys/{journey_id}")
    assert response.status_code == 204

    # Verify journey is deleted
    response = client.get(f"/journeys/{journey_id}")
    assert response.status_code == 404


def test_journey_with_destinations(client, db_setup, created_trip):
    """Test journey links to origin and destination correctly"""
    # Create destinations
    paris = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Paris"},
    ).json()
    london = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "London"},
    ).json()

    # Create journey between them
    journey = client.post(
        "/journeys/",
        json={
            "trip_id": created_trip["id"],
            "origin_id": paris["id"],
            "destination_id": london["id"],
            "transport_mode": "train",
        },
    ).json()

    assert journey["origin_id"] == paris["id"]
    assert journey["destination_id"] == london["id"]


def test_cascade_delete_trip_with_journeys(client, db_setup, created_trip):
    """Test that deleting a trip deletes all related journeys"""
    trip_id = created_trip["id"]

    # Create destinations
    dest1 = client.post(
        "/destinations/", json={"trip_id": trip_id, "name": "Paris"}
    ).json()
    dest2 = client.post(
        "/destinations/", json={"trip_id": trip_id, "name": "London"}
    ).json()

    # Create journey
    journey = client.post(
        "/journeys/",
        json={
            "trip_id": trip_id,
            "origin_id": dest1["id"],
            "destination_id": dest2["id"],
            "transport_mode": "flight",
        },
    ).json()
    journey_id = journey["id"]

    # Delete trip
    response = client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # Verify journey is deleted
    response = client.get(f"/journeys/{journey_id}")
    assert response.status_code == 404


def test_all_transport_modes(client, db_setup, created_trip):
    """Test creating journeys with all supported transport modes"""
    modes = ["flight", "train", "bus", "car", "ferry", "walk"]
    for mode in modes:
        response = client.post(
            "/journeys/",
            json={
                "trip_id": created_trip["id"],
                "transport_mode": mode,
            },
        )
        assert response.status_code == 201
        assert response.json()["transport_mode"] == mode
