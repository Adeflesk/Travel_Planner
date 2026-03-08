"""
tests/test_timezone_endpoint.py

Tests for GET /timezone?lat=X&lng=Y endpoint.
"""


def test_get_timezone_valid_coords_heathrow(client, test_user):
    """Known coords → known timezone."""
    resp = client.get("/timezone?lat=51.4775&lng=-0.4614")
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "Europe/London"


def test_get_timezone_valid_coords_new_york(client, test_user):
    resp = client.get("/timezone?lat=40.6413&lng=-73.7781")
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "America/New_York"


def test_get_timezone_ocean_no_error(client, test_user):
    """Mid-Atlantic ocean: no 500 error; returns timezone string or null.

    timezonefinder >=8 returns nautical Etc/GMT+X timezones for ocean coords
    instead of None, so we accept either.
    """
    resp = client.get("/timezone?lat=0.0&lng=-30.0")
    assert resp.status_code == 200
    tz = resp.json()["timezone"]
    assert tz is None or isinstance(tz, str)


def test_get_timezone_missing_lat(client, test_user):
    resp = client.get("/timezone?lng=-0.4614")
    assert resp.status_code == 422


def test_get_timezone_missing_lng(client, test_user):
    resp = client.get("/timezone?lat=51.4775")
    assert resp.status_code == 422


def test_get_timezone_lat_out_of_range(client, test_user):
    resp = client.get("/timezone?lat=999&lng=-0.4614")
    assert resp.status_code == 422


def test_get_timezone_requires_auth(base_client):
    """No JWT → 401."""
    resp = base_client.get("/timezone?lat=51.4775&lng=-0.4614")
    assert resp.status_code == 401
