# test_main.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta

from main import app
from database import get_db
from models import Base

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Override the get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# Test client
client = TestClient(app)


# Fixtures
@pytest.fixture(scope="function")
def test_db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


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
def created_trip(test_db, sample_trip_data):
    """Create a trip and return its data"""
    response = client.post("/trips/", json=sample_trip_data)
    return response.json()


# ==================== TRIP TESTS ====================


def test_create_trip(test_db, sample_trip_data):
    """Test creating a new trip"""
    response = client.post("/trips/", json=sample_trip_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == sample_trip_data["name"]
    assert float(data["budget"]) == sample_trip_data["budget"]
    assert "id" in data
    assert "created_at" in data


def test_create_trip_missing_required_fields(test_db):
    """Test creating trip without required fields"""
    response = client.post(
        "/trips/",
        json={
            "name": "Incomplete Trip"
            # Missing start_date and end_date
        },
    )
    assert response.status_code == 422  # Validation error


def test_get_all_trips(test_db, created_trip):
    """Test getting all trips"""
    response = client.get("/trips/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == created_trip["name"]


def test_get_trip_by_id(test_db, created_trip):
    """Test getting a specific trip by ID"""
    trip_id = created_trip["id"]
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == trip_id
    assert data["name"] == created_trip["name"]


def test_get_nonexistent_trip(test_db):
    """Test getting a trip that doesn't exist"""
    response = client.get("/trips/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_update_trip(test_db, created_trip):
    """Test updating a trip"""
    trip_id = created_trip["id"]
    update_data = {"name": "Updated Trip Name", "status": "booked"}
    response = client.put(f"/trips/{trip_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Trip Name"
    assert data["status"] == "booked"


def test_delete_trip(test_db, created_trip):
    """Test deleting a trip"""
    trip_id = created_trip["id"]
    response = client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # Verify trip is deleted
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 404


# ==================== DESTINATION TESTS ====================


def test_create_destination(test_db, created_trip):
    """Test creating a destination"""
    destination_data = {
        "trip_id": created_trip["id"],
        "name": "Paris",
        "country": "France",
        "arrival_date": created_trip["start_date"],
        "departure_date": created_trip["end_date"],
    }
    response = client.post("/destinations/", json=destination_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Paris"
    assert data["country"] == "France"
    assert data["trip_id"] == created_trip["id"]


def test_create_destination_invalid_trip(test_db):
    """Test creating destination with non-existent trip"""
    destination_data = {"trip_id": 99999, "name": "Paris", "country": "France"}
    response = client.post("/destinations/", json=destination_data)
    assert response.status_code == 404


def test_get_trip_destinations(test_db, created_trip):
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


def test_update_destination(test_db, created_trip):
    """Test updating a destination"""
    # Create destination
    dest_response = client.post(
        "/destinations/",
        json={"trip_id": created_trip["id"], "name": "Paris", "country": "France"},
    )
    dest_id = dest_response.json()["id"]

    # Update it
    update_data = {"accommodation_name": "Hotel du Louvre"}
    response = client.put(f"/destinations/{dest_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["accommodation_name"] == "Hotel du Louvre"


def test_delete_destination(test_db, created_trip):
    """Test deleting a destination"""
    dest_response = client.post(
        "/destinations/", json={"trip_id": created_trip["id"], "name": "Paris"}
    )
    dest_id = dest_response.json()["id"]

    response = client.delete(f"/destinations/{dest_id}")
    assert response.status_code == 204


# ==================== ACTIVITY TESTS ====================


def test_create_activity(test_db, created_trip):
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


def test_get_destination_activities(test_db, created_trip):
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


# ==================== EXPENSE TESTS ====================


def test_create_expense(test_db, created_trip):
    """Test creating an expense"""
    expense_data = {
        "trip_id": created_trip["id"],
        "category": "food",
        "amount": 45.50,
        "description": "Dinner at restaurant",
        "date": created_trip["start_date"],
        "currency": "USD",
    }
    response = client.post("/expenses/", json=expense_data)
    assert response.status_code == 201
    data = response.json()
    assert float(data["amount"]) == expense_data["amount"]

    assert data["category"] == "food"


def test_get_trip_expenses(test_db, created_trip):
    """Test getting all expenses for a trip"""
    # Create multiple expenses
    expenses = [
        {
            "category": "food",
            "amount": 50,
            "description": "Lunch",
            "date": created_trip["start_date"],
        },
        {
            "category": "transport",
            "amount": 30,
            "description": "Taxi",
            "date": created_trip["start_date"],
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


def test_delete_expense(test_db, created_trip):
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


def test_create_packing_item(test_db, created_trip):
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


def test_get_trip_packing_items(test_db, created_trip):
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


def test_update_packing_item_packed_status(test_db, created_trip):
    """Test marking item as packed"""
    item_response = client.post(
        "/packing-items/", json={"trip_id": created_trip["id"], "item_name": "Passport"}
    )
    item_id = item_response.json()["id"]

    response = client.put(f"/packing-items/{item_id}", json={"is_packed": True})
    assert response.status_code == 200
    assert response.json()["is_packed"] is True


# ==================== INTEGRATION TESTS ====================


def test_cascade_delete_trip_with_data(test_db, created_trip):
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


def test_root_endpoint(test_db):
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["version"] == "1.0.0"
