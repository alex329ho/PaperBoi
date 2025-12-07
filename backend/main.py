"""Entry point for the PaperBoi FastAPI application."""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from backend.config import settings
from backend.middleware.error_handler import setup_exception_handlers
from backend.middleware.logging import RateLimitMiddleware, RequestContextLogMiddleware
from backend.models.database import close_engine, get_engine, init_engine
from backend.utils.exceptions import ApplicationError
from backend.utils.logger import configure_logging, get_logger

logger = get_logger(__name__)


async def init_redis() -> Redis:
    """Initialize the Redis client and validate connectivity."""

    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.ping()
    except Exception as exc:  # noqa: BLE001
        await redis.aclose()
        msg = f"Unable to connect to Redis: {exc}"
        raise ApplicationError(detail=msg, status_code=status.HTTP_503_SERVICE_UNAVAILABLE) from exc
    return redis


def _validate_environment_settings() -> None:
    """Perform additional environment checks beyond Pydantic validation."""

    if settings.environment == "production" and settings.debug:
        raise ApplicationError("Debug mode must be disabled in production", status.HTTP_500_INTERNAL_SERVER_ERROR)


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[override]
    """Manage application startup and shutdown lifecycle."""

    configure_logging()
    _validate_environment_settings()
    await init_engine()
    app.state.redis = await init_redis()
    yield

    if hasattr(app.state, "redis"):
        await app.state.redis.aclose()
    await close_engine()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    debug=settings.debug,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestContextLogMiddleware)

setup_exception_handlers(app)


router = APIRouter(prefix=settings.api_v1_prefix)


@router.get("/status", tags=["system"])
async def status_endpoint() -> dict[str, Any]:
    """Return a lightweight status payload for API consumers."""

    return {
        "app": settings.app_name,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": app.version,
    }


@app.get("/healthz", tags=["system"])
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify service availability."""

    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/ready", tags=["system"])
async def readiness_check(engine: AsyncEngine = Depends(get_engine), redis: Redis = Depends(lambda: app.state.redis)) -> dict[str, str]:
    """Readiness probe to ensure dependencies are reachable."""

    status_report = {"database": "unknown", "cache": "unknown"}

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            status_report["database"] = "connected"
    except SQLAlchemyError as exc:
        logger.error("Database connection failed: %s", exc)
        status_report["database"] = "error"

    try:
        await redis.ping()
        status_report["cache"] = "connected"
    except Exception as exc:  # noqa: BLE001
        logger.error("Redis connection failed: %s", exc)
        status_report["cache"] = "error"

    if status_report["database"] != "connected" or status_report["cache"] != "connected":
        raise ApplicationError(detail=status_report, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

    return status_report


app.include_router(router)
