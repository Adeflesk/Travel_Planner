"""
app/core/job_lock.py - Claim-based run-once execution for scheduled jobs

See app/models/job_run.py for why a unique-constraint claim table is
the right tool. This module is the small API around it:

    from app.core.job_lock import exclusive_job

    def _run_reminders_job():
        with exclusive_job("daily_reminders") as claimed:
            if not claimed:
                return  # another worker won the claim — normal, not an error
            db = SessionLocal()
            try:
                send_due_reminders(db)
            finally:
                db.close()

Failure-handling policy (deliberate):
  * Job raised -> the claim row records success=False + the error,
    and the row REMAINS, so the job does NOT auto-retry today. A
    half-sent reminder batch must not be blindly re-sent; re-running
    is a human decision (delete the row or call release_claim).
  * Worker died mid-job (no exception path ran) -> row stays with
    finished_at NULL. Same policy, same reasoning, and the row is the
    forensic breadcrumb.

The claim uses ITS OWN short-lived session, separate from the job's
working session, so a failed job transaction can never roll back the
claim itself.

Author: Travel Planner Team
"""

import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models

logger = logging.getLogger(__name__)


def _default_run_key() -> str:
    """Daily granularity, UTC — matches the 08:00 UTC cron."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def claim_job_run(
    db: Session, job_name: str, run_key: Optional[str] = None
) -> Optional[models.JobRun]:
    """Try to claim (job_name, run_key). Returns the row if WE won,
    None if another worker already holds it. Never raises for the
    already-claimed case — losing the race is the expected path for
    N-1 of N workers."""
    key = run_key or _default_run_key()
    # Core INSERT, not ORM add(): the losing path (IntegrityError) then
    # leaves no half-registered instance in the session's identity map,
    # which matters because SQLite reuses autoincrement ids after a
    # release_claim() delete.
    stmt = insert(models.JobRun).values(job_name=job_name, run_key=key)
    try:
        result = db.execute(stmt)
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info(
            "Job %s@%s already claimed by another worker; skipping",
            job_name,
            key,
        )
        return None
    return db.get(models.JobRun, result.inserted_primary_key[0])


def complete_job_run(
    db: Session,
    run: models.JobRun,
    success: bool,
    error: Optional[str] = None,
) -> None:
    run.finished_at = datetime.now(timezone.utc)
    run.success = success
    run.error = (error or "")[:500] or None
    db.add(run)
    db.commit()


def release_claim(db: Session, job_name: str, run_key: str) -> bool:
    """Manual/ops escape hatch: delete a claim so a job can re-run.

    Intended for admin tooling or a shell session after investigating
    a failed run — never called automatically (see failure policy)."""
    deleted = (
        db.query(models.JobRun)
        .filter(
            models.JobRun.job_name == job_name,
            models.JobRun.run_key == run_key,
        )
        .delete()
    )
    db.commit()
    return deleted > 0


@contextmanager
def exclusive_job(job_name: str, run_key: Optional[str] = None) -> Iterator[bool]:
    """Context manager wrapping claim -> work -> complete.

    Yields True iff this process won the claim. Exceptions inside the
    block propagate (so existing logging keeps working) AFTER the
    claim row is marked failed."""
    from database import SessionLocal  # local import: avoids cycles at startup

    db = SessionLocal()
    try:
        run = claim_job_run(db, job_name, run_key)
        if run is None:
            yield False
            return
        try:
            yield True
        except Exception as exc:
            complete_job_run(db, run, success=False, error=repr(exc))
            raise
        complete_job_run(db, run, success=True)
    finally:
        db.close()
