def test_get_user_settings_empty_creates_default(client, test_user):
    resp = client.get("/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["default_currency"] == "USD"
    assert data["user_id"] == test_user["user"].id
    flags = data["feature_flags"]
    assert flags["road_trip_builder"] is True
    assert flags["expense_tracking"] is True
    assert flags["packing_list"] is True


def test_update_user_settings(client, test_user):
    # First get to ensure defaults are created
    client.get("/settings/")

    # Now update
    resp = client.patch(
        "/settings/",
        json={
            "default_currency": "EUR",
            "home_base": "London",
            "feature_flags": {"packing_list": False},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["default_currency"] == "EUR"
    assert data["home_base"] == "London"
    flags = data["feature_flags"]
    assert flags["road_trip_builder"] is True  # untouched
    assert flags["packing_list"] is False  # updated


def test_turn_off_all_flags(client, test_user):
    client.get("/settings/")
    resp = client.patch(
        "/settings/",
        json={
            "feature_flags": {
                "road_trip_builder": False,
                "expense_tracking": False,
                "packing_list": False,
            }
        },
    )
    assert resp.status_code == 200
    flags = resp.json()["feature_flags"]
    assert flags["road_trip_builder"] is False
    assert flags["expense_tracking"] is False
    assert flags["packing_list"] is False

    # Also verify GET returns the new values
    resp2 = client.get("/settings/")
    flags2 = resp2.json()["feature_flags"]
    assert flags2["road_trip_builder"] is False
    assert flags2["expense_tracking"] is False
    assert flags2["packing_list"] is False
