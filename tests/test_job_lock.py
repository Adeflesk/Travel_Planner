"""
tests/test_job_lock.py - Run-once claiming for scheduled jobs

The contract under test: for a given (job_name, run_key), exactly one
claimant wins — under sequential retries AND true thread concurrency.
The threaded test is the one that matters: it simulates gunicorn's N
workers all firing the 08:00 cron simultaneously.
"""

import threading

import pytest

from app import models
from app.core.job_lock import claim_job_run, complete_job_run, release_claim


@pytest.fixture()
def db(db_setup, testing_session_local):
    session = testing_session_local()
    yield session
    session.close()


# ----------------------------------------------------------- sequential


def test_first_claim_wins_second_loses(db):
    run = claim_job_run(db, "daily_reminders", "2026-06-12")
    assert run is not None
    assert claim_job_run(db, "daily_reminders", "2026-06-12") is None


def test_different_run_keys_are_independent(db):
    assert claim_job_run(db, "daily_reminders", "2026-06-12") is not None
    assert claim_job_run(db, "daily_reminders", "2026-06-13") is not None


def test_different_job_names_are_independent(db):
    assert claim_job_run(db, "daily_reminders", "2026-06-12") is not None
    assert claim_job_run(db, "weekly_digest", "2026-06-12") is not None


def test_complete_records_outcome(db):
    run = claim_job_run(db, "daily_reminders", "2026-06-12")
    complete_job_run(db, run, success=True)
    stored = (
        db.query(models.JobRun)
        .filter_by(job_name="daily_reminders", run_key="2026-06-12")
        .one()
    )
    assert stored.success is True
    assert stored.finished_at is not None


def test_failed_run_keeps_claim_no_auto_retry(db):
    """Policy: a failed run does NOT free the key — half-sent email
    batches must not blindly re-send. Re-running is a human decision
    via release_claim."""
    run = claim_job_run(db, "daily_reminders", "2026-06-12")
    complete_job_run(db, run, success=False, error="SMTP exploded")

    assert claim_job_run(db, "daily_reminders", "2026-06-12") is None

    assert release_claim(db, "daily_reminders", "2026-06-12") is True
    assert claim_job_run(db, "daily_reminders", "2026-06-12") is not None


def test_error_string_is_truncated(db):
    run = claim_job_run(db, "daily_reminders", "2026-06-12")
    complete_job_run(db, run, success=False, error="x" * 2000)
    db.refresh(run)
    assert len(run.error) == 500


# ---------------------------------------------------------- concurrency


def test_concurrent_claims_exactly_one_winner(db_setup, testing_session_local):
    """Eight threads race for one key — the gunicorn-workers scenario.

    Each thread uses its OWN session (as each worker process would).
    The unique constraint must let exactly one INSERT commit."""
    winners = []
    barrier = threading.Barrier(8)

    def contender():
        session = testing_session_local()
        try:
            barrier.wait()  # maximise the collision window
            if claim_job_run(session, "daily_reminders", "2026-06-12") is not None:
                winners.append(threading.get_ident())
        finally:
            session.close()

    threads = [threading.Thread(target=contender) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(winners) == 1
