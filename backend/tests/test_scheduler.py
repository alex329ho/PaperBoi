from __future__ import annotations

import sys
from pathlib import Path

import time

import pytest
from apscheduler.schedulers.asyncio import AsyncIOScheduler

sys.path.append(str(Path(__file__).resolve().parents[1].parent))

from backend.tasks.scheduler import SchedulerManager


def test_scheduler_registers_jobs() -> None:
    manager = SchedulerManager()
    jobs = manager.scheduler.get_jobs()
    assert len(jobs) >= 7
    ids = {job.id for job in jobs}
    for expected in {
        "fetch-daily-news",
        "generate-daily-summaries",
        "send-daily-emails",
        "update-trending-topics",
        "cleanup-expired-data",
        "check-api-health",
        "retry-failed-emails",
    }:
        assert expected in ids


def test_scheduler_start_stop() -> None:
    manager = SchedulerManager()
    manager.start()
    time.sleep(0)
    assert isinstance(manager.scheduler, AsyncIOScheduler)
    assert manager.scheduler.running
    manager.shutdown()
    time.sleep(0)
    assert not manager.scheduler.running
