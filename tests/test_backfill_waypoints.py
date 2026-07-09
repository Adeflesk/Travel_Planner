"""
tests/test_backfill_waypoints.py - Tests for the waypoint → stop migration.

Verifies that legacy free-text waypoints are converted into TransportStop rows,
and that the migration is idempotent (safe to run twice).
"""

from sqlalchemy import text

from migrations.backfill_waypoints import backfill_waypoints


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_user(conn):
    conn.execute(
        text(
            "INSERT INTO users (email, hashed_password, full_name, is_active, role)"
            " VALUES ('backfill@test.com', 'x', 'Test', 1, 'user')"
        )
    )
    row = conn.execute(
        text("SELECT id FROM users WHERE email='backfill@test.com'")
    ).fetchone()
    return row[0]


def _create_trip(conn, user_id):
    conn.execute(
        text(
            "INSERT INTO trips (user_id, name, start_date, end_date, status, budget)"
            " VALUES (:uid, 'Road Trip', '2026-09-09', '2026-09-15', 'planning', 3000)"
        ),
        {"uid": user_id},
    )
    row = conn.execute(
        text("SELECT id FROM trips WHERE user_id=:uid ORDER BY id DESC LIMIT 1"),
        {"uid": user_id},
    ).fetchone()
    return row[0]


def _create_transport(conn, trip_id, waypoints_text):
    conn.execute(
        text(
            "INSERT INTO trip_transports"
            " (trip_id, transport_type, origin, destination, booked,"
            " overnight, sort_order, booking_reminder_sent, waypoints)"
            " VALUES (:tid, 'drive', 'A', 'B', 0, 0, 0, 0, :wp)"
        ),
        {"tid": trip_id, "wp": waypoints_text},
    )
    row = conn.execute(
        text(
            "SELECT id FROM trip_transports WHERE trip_id=:tid ORDER BY id DESC LIMIT 1"
        ),
        {"tid": trip_id},
    ).fetchone()
    return row[0]


def _count_stops(conn, transport_id):
    row = conn.execute(
        text("SELECT COUNT(*) FROM transport_stops WHERE transport_id=:tid"),
        {"tid": transport_id},
    ).fetchone()
    return row[0]


def _get_stops(conn, transport_id):
    return conn.execute(
        text(
            "SELECT name, category, sort_order FROM transport_stops"
            " WHERE transport_id=:tid ORDER BY sort_order"
        ),
        {"tid": transport_id},
    ).fetchall()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_backfill_creates_stops(db_engine, db_setup):
    """Waypoints text is split into TransportStop rows."""
    with db_engine.connect() as conn:
        uid = _create_user(conn)
        tid = _create_trip(conn, uid)
        transport_id = _create_transport(
            conn, tid, "Desert View Watchtower\nAntelope Canyon\nHorseshoe Bend"
        )
        conn.commit()

    backfill_waypoints(db_engine)

    with db_engine.connect() as conn:
        assert _count_stops(conn, transport_id) == 3
        stops = _get_stops(conn, transport_id)
        assert [s[0] for s in stops] == [
            "Desert View Watchtower",
            "Antelope Canyon",
            "Horseshoe Bend",
        ]
        # All should have category 'other' and incrementing sort_order
        assert all(s[1] == "other" for s in stops)
        assert [s[2] for s in stops] == [0, 1, 2]


def test_backfill_idempotent(db_engine, db_setup):
    """Running backfill twice does not create duplicates."""
    with db_engine.connect() as conn:
        uid = _create_user(conn)
        tid = _create_trip(conn, uid)
        transport_id = _create_transport(conn, tid, "Stop A\nStop B")
        conn.commit()

    backfill_waypoints(db_engine)
    backfill_waypoints(db_engine)  # second run

    with db_engine.connect() as conn:
        assert _count_stops(conn, transport_id) == 2


def test_backfill_skips_empty_waypoints(db_engine, db_setup):
    """Transports with empty waypoints are not touched."""
    with db_engine.connect() as conn:
        uid = _create_user(conn)
        tid = _create_trip(conn, uid)
        transport_id = _create_transport(conn, tid, "")
        conn.commit()

    backfill_waypoints(db_engine)

    with db_engine.connect() as conn:
        assert _count_stops(conn, transport_id) == 0


def test_backfill_skips_null_waypoints(db_engine, db_setup):
    """Transports with NULL waypoints are not touched."""
    with db_engine.connect() as conn:
        uid = _create_user(conn)
        tid = _create_trip(conn, uid)
        transport_id = _create_transport(conn, tid, None)
        conn.commit()

    backfill_waypoints(db_engine)

    with db_engine.connect() as conn:
        assert _count_stops(conn, transport_id) == 0


def test_backfill_strips_blank_lines(db_engine, db_setup):
    """Blank lines in waypoints text are ignored."""
    with db_engine.connect() as conn:
        uid = _create_user(conn)
        tid = _create_trip(conn, uid)
        transport_id = _create_transport(conn, tid, "Stop A\n\n\nStop B\n")
        conn.commit()

    backfill_waypoints(db_engine)

    with db_engine.connect() as conn:
        assert _count_stops(conn, transport_id) == 2
        stops = _get_stops(conn, transport_id)
        assert [s[0] for s in stops] == ["Stop A", "Stop B"]
