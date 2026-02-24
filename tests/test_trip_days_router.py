def test_create_and_get_trip_day(client, test_user):
    # First create a trip to attach the day to
    resp = client.post(
        "/trips/",
        json={
            "name": "Day Test Trip",
            "start_date": "2030-01-01",
            "end_date": "2030-01-10",
            "budget": 1000,
            "status": "planning",
        },
    )
    assert resp.status_code == 201
    trip_id = resp.json()["id"]

    # Create a day
    day_payload = {
        "trip_id": trip_id,
        "date": "2030-01-02",
        "title": "Day 1",
        "location": "Paris",
    }
    resp = client.post("/trip-days/", json=day_payload)
    assert resp.status_code == 201
    day_data = resp.json()
    assert day_data["date"] == "2030-01-02"
    assert day_data["title"] == "Day 1"
    day_id = day_data["id"]

    # Get the days for the trip
    resp = client.get(f"/trip-days/trips/{trip_id}/days")
    assert resp.status_code == 200
    days = resp.json()
    assert len(days) == 1
    assert days[0]["id"] == day_id


def test_create_trip_day_duplicate_date(client, test_user):
    resp = client.post(
        "/trips/",
        json={
            "name": "Dup Trip",
            "start_date": "2030-01-01",
            "end_date": "2030-01-10",
            "status": "planning",
        },
    )
    trip_id = resp.json()["id"]

    # Create first day
    client.post(
        "/trip-days/", json={"trip_id": trip_id, "date": "2030-01-02", "title": "Day 1"}
    )

    # Create duplicate
    resp = client.post(
        "/trip-days/", json={"trip_id": trip_id, "date": "2030-01-02", "title": "Day 2"}
    )
    assert resp.status_code == 400


def test_trip_day_activities(client, test_user):
    # Setup trip and day
    resp = client.post(
        "/trips/",
        json={
            "name": "Act Trip",
            "start_date": "2030-01-01",
            "end_date": "2030-01-10",
            "status": "planning",
        },
    )
    trip_id = resp.json()["id"]
    resp = client.post(
        "/trip-days/", json={"trip_id": trip_id, "date": "2030-01-02", "title": "Day 1"}
    )
    assert resp.status_code == 201, resp.text
    day_id = resp.json()["id"]

    # Create activity
    act_payload = {
        "day_id": day_id,
        "start_time": "09:00",
        "end_time": "11:00",
        "title": "Breakfast",
        "category": "restaurant",
    }
    resp = client.post("/trip-days/activities", json=act_payload)
    assert resp.status_code == 201
    act_data = resp.json()
    assert act_data["title"] == "Breakfast"
    assert act_data["start_time"] == "09:00"
    act_id = act_data["id"]

    # Read activities
    resp = client.get(f"/trip-days/{day_id}/activities")
    assert resp.status_code == 200
    acts = resp.json()
    assert len(acts) == 1
    assert acts[0]["id"] == act_id

    # Update activity
    resp = client.patch(
        f"/trip-days/activities/{act_id}", json={"title": "Brunch", "cost": 15.5}
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["title"] == "Brunch"
    assert updated["cost"] == 15.5

    # Delete activity
    resp = client.delete(f"/trip-days/activities/{act_id}")
    assert resp.status_code == 204

    resp = client.get(f"/trip-days/{day_id}/activities")
    assert len(resp.json()) == 0

    # Delete Day
    resp = client.delete(f"/trip-days/{day_id}")
    assert resp.status_code == 204
