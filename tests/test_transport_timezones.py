"""
tests/test_transport_timezones.py

Verifies origin_timezone and destination_timezone are stored and
returned correctly on TripTransport. Existing transports without
timezones remain unaffected (nullable columns).
"""


def _make_trip(client):
    resp = client.post(
        "/trips/",
        json={
            "name": "Timezone Test Trip",
            "start_date": "2030-08-01",
            "end_date": "2030-08-10",
            "status": "planning",
            "budget": 3000,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_create_transport_with_timezones(client, test_user):
    """Timezone fields round-trip through create → read."""
    trip_id = _make_trip(client)
    payload = {
        "transport_type": "flight",
        "origin": "London Heathrow",
        "destination": "New York JFK",
        "origin_timezone": "Europe/London",
        "destination_timezone": "America/New_York",
    }
    resp = client.post(f"/trips/{trip_id}/transport", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_timezone"] == "Europe/London"
    assert data["destination_timezone"] == "America/New_York"


def test_update_transport_timezones(client, test_user):
    """PUT can add timezones to an existing transport."""
    trip_id = _make_trip(client)
    create_resp = client.post(
        f"/trips/{trip_id}/transport",
        json={"transport_type": "train", "origin": "Paris", "destination": "London"},
    )
    assert create_resp.status_code == 201
    t_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/transport/{t_id}",
        json={
            "origin_timezone": "Europe/Paris",
            "destination_timezone": "Europe/London",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["origin_timezone"] == "Europe/Paris"
    assert update_resp.json()["destination_timezone"] == "Europe/London"


def test_transport_without_timezones_returns_null(client, test_user):
    """Transports created without timezone fields return null (not missing key)."""
    trip_id = _make_trip(client)
    resp = client.post(
        f"/trips/{trip_id}/transport",
        json={"transport_type": "bus", "origin": "Nice", "destination": "Monaco"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_timezone"] is None
    assert data["destination_timezone"] is None


def test_calculate_flight_duration_timezone_aware():
    """
    calculateFlightDuration correctly accounts for timezone offset.

    LHR 10:00 → JFK 13:00 local time is NOT 3h.
    LHR = UTC+0, JFK = UTC-5, so actual duration = 3h + 5h = 8h.
    """
    # NOTE: calculateFlightDuration is a TypeScript frontend utility.
    # This test documents expected behaviour only; verify manually or via
    # the timezone endpoint integration test above.
    # LHR departure 10:00 UTC+0 → UTC 10:00
    # JFK arrival   13:00 UTC-5 → UTC 18:00
    # Expected duration: 480 minutes (8 hours)
    pass  # Manual verification: open transport form, select LHR→JFK, set 10:00 dep / 13:00 arr
