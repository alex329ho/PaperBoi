"""FastAPI application entrypoint for PaperBoi."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from middleware.error_handler import register_exception_handlers
from middleware.logging import RequestContextLogMiddleware
from models import news, user  # noqa: F401 - imported for metadata registration
from models.database import Base, dispose_engine, get_session, validate_connection
from utils.logger import configure_logging, get_logger

configure_logging(settings)
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)

# Middleware configuration
app.add_middleware(RequestContextLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

api_router = APIRouter(prefix=settings.api_v1_prefix)


@api_router.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """Simple liveness probe."""

    return {"status": "ok", "environment": settings.environment}


@api_router.get("/status", tags=["health"])
async def status_check(session: AsyncSession = Depends(get_session)) -> Dict[str, Any]:
    """Validate dependencies including database connectivity."""

    await session.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}


@app.on_event("startup")
async def on_startup() -> None:
    """Validate configuration and database connectivity when the app boots."""

    logger.info("Starting application", extra={"environment": settings.environment})
    settings.require_secure_configuration()
    await validate_connection()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Gracefully release resources on shutdown."""

    try:
        await dispose_engine()
    except Exception:  # noqa: BLE001
        logger.exception("Failed to dispose database engine during shutdown")


@app.get("/healthz", include_in_schema=False)
async def root_healthcheck() -> JSONResponse:
    """Kubernetes-friendly liveness endpoint without API versioning."""

    return JSONResponse(content={"status": "ok"})


# Placeholder for future routers under /api/v1
app.include_router(api_router)


__all__ = ["app", "Base"]
