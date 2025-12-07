"""FastAPI entrypoint for PaperBoi."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

import redis.asyncio as redis
from fastapi import APIRouter, Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session, init_engine, shutdown_engine, validate_database_connection
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware
from app.utils.exceptions import ServiceUnavailableException
from app.utils.logger import setup_logging

logger = logging.getLogger(__name__)


async def init_redis_client() -> redis.Redis:
    """Create a Redis client and verify connectivity."""
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        await client.ping()
        logger.info("Redis connectivity validated")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Redis connection failed")
        raise ServiceUnavailableException("Redis unavailable") from exc
    return client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    settings.ensure_valid()
    setup_logging()

    await init_engine()
    await validate_database_connection()

    app.state.redis = await init_redis_client()
    logger.info("Application startup complete", extra={"request_id": "startup"})
    try:
        yield
    finally:
        await shutdown_engine()
        if app.state.redis:
            await app.state.redis.close()
        logger.info("Application shutdown complete", extra={"request_id": "shutdown"})


def create_app() -> FastAPI:
    """Create the FastAPI application instance."""
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
        version="1.0.0",
    )

    # CORS setup
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    # Logging middleware
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    api_router = APIRouter(prefix=settings.api_v1_prefix)

    @api_router.get("/health", tags=["health"], status_code=status.HTTP_200_OK)
    async def health_check() -> Dict[str, Any]:
        """Return lightweight service health information."""
        return {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": settings.environment,
        }

    @api_router.get("/status", tags=["health"], status_code=status.HTTP_200_OK)
    async def status_check(db: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
        """Perform deeper readiness checks including database connectivity."""
        report: Dict[str, Any] = {"database": "unknown", "redis": "unknown"}

        try:
            await db.execute(text("SELECT 1"))
            report["database"] = "connected"
        except Exception as exc:  # noqa: BLE001
            logger.exception("Database status check failed")
            report["database"] = f"error: {exc}"  # noqa: G004

        try:
            await app.state.redis.ping()
            report["redis"] = "connected"
        except Exception as exc:  # noqa: BLE001
            logger.exception("Redis status check failed")
            report["redis"] = f"error: {exc}"  # noqa: G004

        if any(value.startswith("error") for value in report.values() if isinstance(value, str)):
            raise ServiceUnavailableException("One or more dependencies are unavailable")

        return report

    app.include_router(api_router)

    @app.get("/healthz", tags=["health"], status_code=status.HTTP_200_OK)
    async def legacy_health() -> Dict[str, str]:
        """Legacy health endpoint for orchestration systems."""
        return {"status": "ok"}

    return app


app = create_app()
