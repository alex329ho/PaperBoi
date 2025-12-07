"""Entry point for the PaperBoi FastAPI application."""
from datetime import datetime, timezone
from typing import Any, Dict

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

# Database and cache clients
engine: AsyncEngine | None = None
redis_client: Redis | None = None
scheduler = AsyncIOScheduler(timezone=settings.scheduler_timezone)


async def get_engine() -> AsyncEngine:
    """Return the initialized SQLAlchemy engine."""
    if engine is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database engine not initialized")
    return engine


async def get_redis() -> Redis:
    """Return the initialized Redis client."""
    if redis_client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Redis client not initialized")
    return redis_client


async def fetch_latest_news() -> None:
    """Scheduled task placeholder for fetching and summarizing news articles."""
    logger.info("Running scheduled news fetch at {}", datetime.now(timezone.utc).isoformat())
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(settings.gdelt_api_url)
            response.raise_for_status()
            logger.debug("Fetched news payload size: {} bytes", len(response.content))
    except httpx.HTTPError as exc:
        logger.error("Failed to fetch news: {}", exc)


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize external connections and scheduled jobs."""
    global engine, redis_client
    logger.info("Starting PaperBoi backend in %s mode", settings.environment)

    engine = create_async_engine(settings.database_url, echo=settings.debug, future=True)
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

    scheduler.add_job(fetch_latest_news, "cron", **{k: v for k, v in zip(["minute", "hour", "day", "month", "day_of_week"], settings.scheduler_news_cron.split())})
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Clean up external connections when the service stops."""
    if scheduler.running:
        scheduler.shutdown()
    if redis_client:
        await redis_client.close()
    if engine:
        await engine.dispose()


@app.get("/healthz", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Simple health check to verify the API is responsive."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready", response_model=Dict[str, Any])
async def readiness_check(db: AsyncEngine = Depends(get_engine), cache: Redis = Depends(get_redis)) -> Dict[str, Any]:
    """Readiness probe that validates access to the database and Redis."""
    status_report: Dict[str, Any] = {"database": "unknown", "cache": "unknown"}

    try:
        async with db.connect() as connection:
            await connection.execute(text("SELECT 1"))
            status_report["database"] = "connected"
    except SQLAlchemyError as exc:
        logger.error("Database connection failed: {}", exc)
        status_report["database"] = "error"

    try:
        await cache.ping()
        status_report["cache"] = "connected"
    except Exception as exc:  # noqa: BLE001
        logger.error("Redis connection failed: {}", exc)
        status_report["cache"] = "error"

    if status_report["database"] != "connected" or status_report["cache"] != "connected":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=status_report)

    return status_report


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:  # type: ignore[override]
    """Handle unexpected exceptions with a user-friendly message."""
    logger.exception("Unhandled error: {}", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )
