"""APScheduler integration for PaperBoi."""
from __future__ import annotations

import asyncio
import importlib
from typing import Any, Callable, Dict

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.schedulers.base import STATE_STOPPED
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from pytz import UTC

from backend.config import settings
from backend.config.schedules import DEFAULT_TIMEOUT_SECONDS, DEFAULT_TIMEZONE, JOB_SCHEDULES
from backend.tasks import jobs
from backend.tasks.notifications import send_job_alert
from backend.tasks.utils import run_with_timeout, sync_database_url
from backend.utils.logger import get_logger

logger = get_logger(__name__)


async def execute_job(func_path: str, *, timeout: int, job_id: str, **kwargs: Any) -> None:
    module_name, func_name = func_path.split(":")
    module = importlib.import_module(module_name)
    target = getattr(module, func_name)
    try:
        await run_with_timeout(target(**kwargs), timeout=timeout, job_name=job_id)
    except asyncio.TimeoutError:
        send_job_alert(f"Job {job_id} timed out", extra={"job_id": job_id})
    except Exception as exc:  # noqa: BLE001
        send_job_alert(f"Job {job_id} failed", extra={"job_id": job_id, "error": str(exc)})
        raise


class SchedulerManager:
    """Manage APScheduler lifecycle and job registration."""

    def __init__(self, *, timezone: Any = DEFAULT_TIMEZONE) -> None:
        jobstores = {
            "default": SQLAlchemyJobStore(url=sync_database_url(settings.database_url)),
        }
        executors = {
            "default": ThreadPoolExecutor(max_workers=5),
        }
        self.scheduler = AsyncIOScheduler(jobstores=jobstores, executors=executors, timezone=timezone or UTC)
        self._register_default_jobs()

    def _register_default_jobs(self) -> None:
        for name, config in JOB_SCHEDULES.items():
            job_func = getattr(jobs, name)
            trigger = self._build_trigger(config)
            self.add_job(
                job_func,
                trigger=trigger,
                id=config.get("id", name),
                max_instances=config.get("max_instances", 1),
                misfire_grace_time=config.get("misfire_grace_time"),
            )

    def _build_trigger(self, config: Dict[str, Any]):
        trigger_type = config.get("trigger", "interval")
        kwargs = {k: v for k, v in config.items() if k not in {"trigger", "id", "max_instances", "misfire_grace_time"}}
        if trigger_type == "cron":
            return CronTrigger(timezone=DEFAULT_TIMEZONE, **kwargs)
        return IntervalTrigger(timezone=DEFAULT_TIMEZONE, **kwargs)

    def add_job(
        self,
        func: Callable[..., Any],
        *,
        trigger: Any,
        id: str,
        max_instances: int = 1,
        misfire_grace_time: int | None = None,
    ) -> None:
        func_path = f"{func.__module__}:{func.__name__}"
        self.scheduler.add_job(
            execute_job,
            trigger=trigger,
            id=id,
            kwargs={"func_path": func_path, "timeout": DEFAULT_TIMEOUT_SECONDS, "job_id": id},
            max_instances=max_instances,
            replace_existing=True,
            misfire_grace_time=misfire_grace_time,
        )
        logger.info("Job registered", extra={"job": id, "trigger": str(trigger)})

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            # AsyncIOScheduler relies on an active event loop for graceful shutdown.
            # When used in synchronous contexts (e.g., lightweight tests), the state
            # may not transition automatically, so we enforce the stopped flag.
            self.scheduler.state = STATE_STOPPED
            logger.info("Scheduler stopped")

    def list_jobs(self) -> list[dict[str, Any]]:
        return [job.__getstate__() for job in self.scheduler.get_jobs()]

    def update_job_schedule(self, job_id: str, *, trigger_type: str = "cron", **trigger_kwargs: Any) -> None:
        job = self.scheduler.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        if trigger_type == "interval":
            trigger = IntervalTrigger(timezone=DEFAULT_TIMEZONE, **trigger_kwargs)
        else:
            trigger = CronTrigger(timezone=DEFAULT_TIMEZONE, **trigger_kwargs)

        job.reschedule(trigger=trigger)
        logger.info("Job rescheduled", extra={"job": job_id, "trigger": str(trigger)})
