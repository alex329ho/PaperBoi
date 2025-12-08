"""Health and system endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.dependencies import get_db_session, get_redis
from backend.middleware.rate_limit import RateLimiter
from backend.utils.logger import get_logger

router = APIRouter(prefix="", tags=["health"])
logger = get_logger(__name__)
rate_limiter = RateLimiter()


def envelope(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/health", dependencies=[Depends(rate_limiter.dependency("health:basic"))])
async def health() -> Dict[str, Any]:
    """Basic health probe."""

    return envelope({"status": "healthy", "version": "1.0.0", "checks": {}})


@router.get("/health/db", dependencies=[Depends(rate_limiter.dependency("health:db"))])
async def health_db(session: AsyncSession = Depends(get_db_session)) -> Dict[str, Any]:
    """Database connectivity check."""

    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Database health check failed", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="database unavailable") from exc
    return envelope({"database": "ok"})


@router.get("/health/cache", dependencies=[Depends(rate_limiter.dependency("health:cache"))])
async def health_cache(redis_client: Redis = Depends(get_redis)) -> Dict[str, Any]:
    """Cache connectivity check."""

    try:
        await redis_client.ping()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Cache health check failed", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="cache unavailable") from exc
    return envelope({"cache": "ok"})


@router.get("/status", dependencies=[Depends(rate_limiter.dependency("health:status"))])
async def status_report(
    session: AsyncSession = Depends(get_db_session), redis_client: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """Return system status and metrics."""

    db_ok = cache_ok = False
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.exception("Database status check failed")
    try:
        await redis_client.ping()
        cache_ok = True
    except Exception:
        logger.exception("Cache status check failed")

    return envelope({"database": "ok" if db_ok else "error", "cache": "ok" if cache_ok else "error"})


__all__ = ["router"]
