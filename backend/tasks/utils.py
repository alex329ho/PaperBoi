"""Utility helpers for scheduler jobs."""
from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, time as dtime
from typing import Any, AsyncIterator, Awaitable, Callable, Iterable, List, TypeVar

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.config import settings
from backend.models.database import AsyncSessionLocal, engine
from backend.utils.logger import get_logger

_T = TypeVar("_T")

_logger = get_logger(__name__)
_redis_client: Redis | None = None


async def create_redis_client() -> Redis:
    """Return a cached Redis client for background tasks."""

    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


@asynccontextmanager
async def session_scope(session_factory: async_sessionmaker[AsyncSession] | None = None) -> AsyncIterator[AsyncSession]:
    """Provide a transactional scope for job execution."""

    factory = session_factory or AsyncSessionLocal
    session = factory()
    try:
        yield session
        await session.commit()
    except Exception:  # noqa: BLE001
        await session.rollback()
        raise
    finally:
        await session.close()


async def run_with_timeout(coro: Awaitable[_T], *, timeout: int, job_name: str) -> _T:
    """Run a coroutine with a timeout, raising ``TimeoutError`` on expiry."""

    return await asyncio.wait_for(coro, timeout=timeout)


@contextlib.asynccontextmanager
async def timed_operation(operation: str, *, logger: logging.Logger | None = None, extra: dict[str, Any] | None = None):
    """Measure execution time for a job or operation."""

    start = time.perf_counter()
    log = logger or _logger
    log.info("Starting operation", extra={"operation": operation, **(extra or {})})
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        log.info("Completed operation", extra={"operation": operation, "duration_ms": round(duration * 1000, 2), **(extra or {})})


async def gather_with_concurrency(limit: int, coros: Iterable[Callable[[], Awaitable[_T]]]) -> List[_T]:
    """Run coroutines with a concurrency limit."""

    semaphore = asyncio.Semaphore(limit)

    async def _run(func: Callable[[], Awaitable[_T]]) -> _T:
        async with semaphore:
            return await func()

    return await asyncio.gather(*[_run(coro) for coro in coros])


def sync_database_url(async_url: str) -> str:
    """Convert an async SQLAlchemy URL into a sync-compatible URL for APScheduler."""

    if "+aiosqlite" in async_url:
        return async_url.replace("+aiosqlite", "")
    if "+asyncpg" in async_url:
        return async_url.replace("+asyncpg", "")
    return async_url


def should_run_for_user(preferred_time: str | None, now: datetime) -> bool:
    """Determine if a user-specific job should run at the current time."""

    if not preferred_time:
        return False
    try:
        hours, minutes = [int(part) for part in preferred_time.split(":")]
        scheduled = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)
    except ValueError:
        return False
    difference = abs((now - scheduled).total_seconds())
    return difference <= 900  # within 15-minute window


def normalize_time(value: str | dtime | None) -> dtime | None:
    """Normalize time inputs to a timezone-aware ``time`` instance."""

    if value is None:
        return None
    if isinstance(value, dtime):
        return value
    try:
        hour, minute = [int(part) for part in value.split(":")]
        return dtime(hour=hour, minute=minute)
    except Exception:  # noqa: BLE001
        return None


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the application's async session factory."""

    return AsyncSessionLocal


async def ensure_engine_ready() -> None:
    """Ensure the SQLAlchemy engine is warm and ready for pooled usage."""

    async with engine.connect() as connection:
        await connection.execution_options(schema_translate_map={}).get_raw_connection()
