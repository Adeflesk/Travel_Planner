"""
app/models/job_run.py - Run-once ledger for scheduled jobs

The problem: `BackgroundScheduler` lives inside the web process, and
gunicorn runs N workers (railway.toml: --workers 4), so every cron job
fires N times — duplicate reminder emails in production.

The fix is a claim table with a UNIQUE constraint, not a lock:

  * Each job invocation computes a `run_key` (e.g. "2026-06-12" for a
    daily job) and tries to INSERT (job_name, run_key).
  * The unique constraint makes the database the arbiter: exactly one
    worker's INSERT commits; the rest hit IntegrityError and skip.

Why this beats advisory locks / file locks:
  * Atomic under TRUE concurrency (all workers fire at 08:00:00).
  * Also prevents SEQUENTIAL double-runs (worker restarts at 08:01
    won't re-fire — the row for today already exists), which a held
    lock cannot do.
  * Dialect-agnostic: identical behaviour on SQLite (dev) and
    Postgres (prod). pg_advisory_lock has no SQLite equivalent and
    file locks don't survive multi-machine deployments.
  * Free audit trail: started/finished/success per run.

Remember to import in app/models/__init__.py so create_all sees it:
    from .job_run import JobRun  # noqa: F401

Author: Travel Planner Team
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint

from .base import Base


class JobRun(Base):
    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True, index=True)
    job_name = Column(String(100), nullable=False)
    # One row per logical run: "2026-06-12" for daily jobs,
    # "2026-06-12T08" for hourly, etc. The claimant defines granularity.
    run_key = Column(String(50), nullable=False)

    started_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    finished_at = Column(DateTime, nullable=True)
    # None = still running (or worker died mid-job; see job_lock notes)
    success = Column(Boolean, nullable=True)
    error = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("job_name", "run_key", name="uq_job_runs_name_key"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<JobRun {self.job_name}@{self.run_key} " f"success={self.success}>"
