"""
Unit tests for app.services.practicality_service

Covers:
- Journey not found
- Empty segments (no segments → zeros)
- Transport segment: cost from metadata_json (user-entered)
- Transport segment: duration from start/end datetimes
- Transport segment: timezone-aware duration calculation
- Transport segment: selected SegmentOption cost takes priority over metadata
- Transport segment: selected option with no cost falls back to metadata cost
- Stop segment: cost/duration from active StopOptions
- Stop segment: ignores non-active StopOptions
- Transition buffer calculation
- time_feasible / budget_feasible flags
- Daily budget calculation (from trip budget + duration)
- Daily budget equals full budget when trip has no dates
- No daily budget when trip has no budget set
"""

import json
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from app.services.practicality_service import get_journey_practicality

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_function():
    models.Base.metadata.create_all(bind=engine)


def teardown_function():
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_trip(db, *, budget=None, start_date=None, end_date=None):
    trip = models.Trip(
        name="Test Trip",
        start_date=start_date or date(2024, 7, 1),
        end_date=end_date or date(2024, 7, 10),
        budget=budget,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def _make_journey(db, trip_id):
    journey = models.Journey(trip_id=trip_id, transport_mode="FLIGHT", order=0)
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey


def _make_segment(
    db,
    journey_id,
    *,
    segment_type="FLIGHT",
    order=0,
    metadata=None,
    start_dt=None,
    end_dt=None,
    origin_tz=None,
    dest_tz=None,
    origin_name="Origin",
    dest_name="Destination",
):
    seg = models.JourneySegment(
        journey_id=journey_id,
        segment_type=segment_type,
        origin_name=origin_name,
        destination_name=dest_name,
        start_datetime=start_dt,
        end_datetime=end_dt,
        origin_timezone=origin_tz,
        destination_timezone=dest_tz,
        metadata_json=json.dumps(metadata) if metadata else None,
        order=order,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_journey_not_found_returns_none():
    db = TestingSessionLocal()
    try:
        result = get_journey_practicality(journey_id=99999, db=db)
        assert result is None
    finally:
        db.close()


def test_empty_journey_returns_zeros():
    """Journey with no segments returns zeros and no cost."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)

        result = get_journey_practicality(journey.id, db)

        assert result is not None
        assert result.total_duration_minutes == 0
        assert result.total_cost == Decimal("0")
        assert result.transition_count == 0
        assert result.segments == []
    finally:
        db.close()


def test_transport_cost_from_metadata():
    """Cost entered in the UI (stored in metadata_json) is picked up."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "250.00", "currency": "USD"})

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("250.00")
        assert result.segments[0].cost == Decimal("250.00")
    finally:
        db.close()


def test_transport_cost_metadata_string_value():
    """Metadata cost stored as string (from input field) is parsed correctly."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "89.99"})

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("89.99")
    finally:
        db.close()


def test_transport_cost_zero_metadata_ignored():
    """Zero / empty cost in metadata should not contribute to total."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "0", "currency": "USD"})

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("0")
    finally:
        db.close()


def test_transport_duration_from_datetimes():
    """Duration falls back to end_datetime - start_datetime when no SegmentOption."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        start = datetime(2024, 7, 1, 10, 0, 0)
        end = datetime(2024, 7, 1, 12, 30, 0)  # 150 minutes later
        _make_segment(db, journey.id, start_dt=start, end_dt=end)

        result = get_journey_practicality(journey.id, db)

        assert result.total_duration_minutes == 150
    finally:
        db.close()


def test_transport_duration_timezone_aware():
    """Duration is computed correctly when origin is UTC+2 and destination UTC+5."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        # Depart at 10:00 local (UTC+2) = 08:00 UTC
        # Arrive at 15:00 local (UTC+5) = 10:00 UTC
        # Actual flight time = 2 hours = 120 minutes
        start = datetime(2024, 7, 1, 10, 0, 0)  # naive, but tz will be applied
        end = datetime(2024, 7, 1, 15, 0, 0)  # naive, but tz will be applied
        _make_segment(
            db,
            journey.id,
            start_dt=start,
            end_dt=end,
            origin_tz="Europe/Paris",  # UTC+2 in summer
            dest_tz="Asia/Yekaterinburg",  # UTC+5
        )

        result = get_journey_practicality(journey.id, db)

        # Without timezone: 15:00 - 10:00 = 300 min (wrong)
        # With timezone:    10:00+02 → 08:00 UTC, 15:00+05 → 10:00 UTC = 120 min (correct)
        assert result.total_duration_minutes == 120
    finally:
        db.close()


def test_transport_selected_option_cost_takes_priority():
    """A selected SegmentOption's cost overrides metadata cost."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        seg = _make_segment(db, journey.id, metadata={"cost": "100.00"})

        option = models.SegmentOption(
            segment_id=seg.id,
            name="Ryanair",
            cost=Decimal("79.00"),
            estimated_duration=90,
            status="selected",
        )
        db.add(option)
        db.commit()

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("79.00")
        assert result.total_duration_minutes == 90
    finally:
        db.close()


def test_transport_selected_option_no_cost_falls_back_to_metadata():
    """When selected option has no cost, metadata cost is used instead."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        seg = _make_segment(db, journey.id, metadata={"cost": "150.00"})

        option = models.SegmentOption(
            segment_id=seg.id,
            name="No-Cost Option",
            cost=None,
            estimated_duration=60,
            status="selected",
        )
        db.add(option)
        db.commit()

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("150.00")
    finally:
        db.close()


def test_transport_non_selected_option_ignored():
    """SegmentOptions with status other than 'selected' are not used."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        seg = _make_segment(db, journey.id, metadata={"cost": "200.00"})

        option = models.SegmentOption(
            segment_id=seg.id,
            name="Researching Only",
            cost=Decimal("50.00"),
            status="researching",
        )
        db.add(option)
        db.commit()

        result = get_journey_practicality(journey.id, db)

        # researching option ignored → falls back to metadata cost
        assert result.total_cost == Decimal("200.00")
    finally:
        db.close()


def test_stop_segment_cost_and_duration_from_active_options():
    """Stop segment sums cost/duration from 'considering', 'selected', 'done' options."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        seg = _make_segment(db, journey.id, segment_type="STOP")

        active_statuses = ["considering", "selected", "done"]
        for i, status in enumerate(active_statuses):
            opt = models.StopOption(
                segment_id=seg.id,
                name=f"Activity {i}",
                estimated_duration=30,
                estimated_cost=Decimal("15.00"),
                status=status,
            )
            db.add(opt)
        db.commit()

        result = get_journey_practicality(journey.id, db)

        assert result.total_duration_minutes == 90  # 3 × 30
        assert result.total_cost == Decimal("45.00")  # 3 × 15
    finally:
        db.close()


def test_stop_segment_ignores_inactive_options():
    """Stop segment ignores StopOptions not in the active statuses."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        seg = _make_segment(db, journey.id, segment_type="STOP")

        inactive = models.StopOption(
            segment_id=seg.id,
            name="Skipped Activity",
            estimated_duration=60,
            estimated_cost=Decimal("40.00"),
            status="skipped",
        )
        db.add(inactive)
        db.commit()

        result = get_journey_practicality(journey.id, db)

        assert result.total_duration_minutes == 0
        assert result.total_cost == Decimal("0")
    finally:
        db.close()


def test_transition_buffers_added():
    """Buffer minutes are added between segments."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        start = datetime(2024, 7, 1, 10, 0, 0)
        mid = datetime(2024, 7, 1, 12, 0, 0)
        end = datetime(2024, 7, 1, 14, 0, 0)
        _make_segment(db, journey.id, start_dt=start, end_dt=mid, order=0)
        _make_segment(db, journey.id, start_dt=mid, end_dt=end, order=1)

        # 2 segments → 1 transition → 1 × 15 min buffer = 15 min added
        result = get_journey_practicality(journey.id, db, buffer_minutes=15)

        # Each segment: 120 min + 15 min buffer between them
        assert result.transition_count == 1
        assert result.total_duration_minutes == 120 + 120 + 15
        assert result.buffer_minutes_per_transition == 15
    finally:
        db.close()


def test_multiple_segment_costs_summed():
    """Total cost is the sum of all segment costs."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "100.00"}, order=0)
        _make_segment(
            db, journey.id, metadata={"cost": "50.00"}, order=1, segment_type="TRANSFER"
        )

        result = get_journey_practicality(journey.id, db)

        assert result.total_cost == Decimal("150.00")
    finally:
        db.close()


def test_time_feasible_true_when_under_limit():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        start = datetime(2024, 7, 1, 10, 0, 0)
        end = datetime(2024, 7, 1, 11, 0, 0)  # 60 min
        _make_segment(db, journey.id, start_dt=start, end_dt=end)

        result = get_journey_practicality(journey.id, db, time_limit_minutes=120)

        assert result.time_feasible is True
    finally:
        db.close()


def test_time_feasible_false_when_over_limit():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        start = datetime(2024, 7, 1, 10, 0, 0)
        end = datetime(2024, 7, 1, 14, 0, 0)  # 240 min
        _make_segment(db, journey.id, start_dt=start, end_dt=end)

        result = get_journey_practicality(journey.id, db, time_limit_minutes=120)

        assert result.time_feasible is False
    finally:
        db.close()


def test_budget_feasible_true_when_under_budget():
    db = TestingSessionLocal()
    try:
        # 9-day trip, $900 budget → $100/day
        trip = _make_trip(
            db,
            budget=Decimal("900.00"),
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 10),
        )
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "80.00"})

        result = get_journey_practicality(journey.id, db)

        assert result.daily_budget == Decimal("100.00")
        assert result.budget_feasible is True
    finally:
        db.close()


def test_budget_feasible_false_when_over_budget():
    db = TestingSessionLocal()
    try:
        trip = _make_trip(
            db,
            budget=Decimal("900.00"),
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 10),
        )
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "150.00"})

        result = get_journey_practicality(journey.id, db)

        assert result.budget_feasible is False
    finally:
        db.close()


def test_daily_budget_is_budget_divided_by_days():
    """Daily budget = total budget / trip duration in days."""
    db = TestingSessionLocal()
    try:
        # 5-day trip with $500 budget → $100/day
        trip = _make_trip(
            db,
            budget=Decimal("500.00"),
            start_date=date(2024, 7, 1),
            end_date=date(2024, 7, 6),
        )
        journey = _make_journey(db, trip.id)

        result = get_journey_practicality(journey.id, db)

        assert result.daily_budget == Decimal("100.00")
    finally:
        db.close()


def test_daily_budget_equals_full_budget_when_zero_day_trip():
    """When trip start == end (0 days), daily_budget equals the full budget."""
    db = TestingSessionLocal()
    try:
        same_day = date(2024, 7, 1)
        trip = _make_trip(
            db, budget=Decimal("300.00"), start_date=same_day, end_date=same_day
        )
        journey = _make_journey(db, trip.id)

        result = get_journey_practicality(journey.id, db)

        assert result.daily_budget == Decimal("300.00")
    finally:
        db.close()


def test_daily_budget_none_when_no_trip_budget():
    """When trip has no budget, daily_budget is None and budget_feasible is True."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db, budget=None)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, metadata={"cost": "9999.00"})

        result = get_journey_practicality(journey.id, db)

        assert result.daily_budget is None
        assert result.budget_feasible is True
    finally:
        db.close()


def test_segment_display_names_in_results():
    """Segment names are built from origin/destination names."""
    db = TestingSessionLocal()
    try:
        trip = _make_trip(db)
        journey = _make_journey(db, trip.id)
        _make_segment(db, journey.id, origin_name="JFK", dest_name="LHR")

        result = get_journey_practicality(journey.id, db)

        assert result.segments[0].name == "JFK -> LHR"
    finally:
        db.close()
