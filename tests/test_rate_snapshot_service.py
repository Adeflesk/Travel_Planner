"""Tests for rate snapshot recording and querying."""
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.rate_snapshot import RateSnapshot
from app.services.rate_snapshot_service import record_snapshots, get_rate_history


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_record_snapshots_inserts_rows(db_session):
    """Recording snapshots should insert one row per target currency."""
    rates = {"EUR": 0.92, "GBP": 0.79, "JPY": 149.5}
    record_snapshots(db_session, "USD", rates, target_currencies=["EUR", "GBP"])

    rows = db_session.query(RateSnapshot).all()
    assert len(rows) == 2
    assert {r.target_currency for r in rows} == {"EUR", "GBP"}
    assert float(rows[0].rate) in [0.92, 0.79]


def test_record_snapshots_skips_if_no_targets(db_session):
    """If no target currencies given, nothing is inserted."""
    rates = {"EUR": 0.92}
    record_snapshots(db_session, "USD", rates, target_currencies=[])

    rows = db_session.query(RateSnapshot).all()
    assert len(rows) == 0


def test_get_rate_history_returns_sorted_points(db_session):
    """History should be returned sorted by fetched_at ascending."""
    now = datetime.now(timezone.utc)
    for i in range(3):
        db_session.add(
            RateSnapshot(
                base_currency="USD",
                target_currency="EUR",
                rate=Decimal(str(0.90 + i * 0.01)),
                fetched_at=now - timedelta(days=2 - i),
            )
        )
    db_session.commit()

    history = get_rate_history(
        db_session,
        "USD",
        "EUR",
        from_date=now - timedelta(days=3),
        to_date=now + timedelta(days=1),
    )
    assert len(history) == 3
    assert history[0].fetched_at < history[1].fetched_at < history[2].fetched_at


def test_get_rate_history_filters_by_date(db_session):
    """Only snapshots within the date range should be returned."""
    now = datetime.now(timezone.utc)
    db_session.add(
        RateSnapshot(
            base_currency="USD",
            target_currency="EUR",
            rate=Decimal("0.90"),
            fetched_at=now - timedelta(days=10),
        )
    )
    db_session.add(
        RateSnapshot(
            base_currency="USD",
            target_currency="EUR",
            rate=Decimal("0.92"),
            fetched_at=now - timedelta(days=1),
        )
    )
    db_session.commit()

    history = get_rate_history(
        db_session,
        "USD",
        "EUR",
        from_date=now - timedelta(days=5),
        to_date=now,
    )
    assert len(history) == 1
    assert float(history[0].rate) == pytest.approx(0.92)
