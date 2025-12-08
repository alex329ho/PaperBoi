"""FastAPI application entrypoint for PaperBoi."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.middleware.auth import JWTAuthMiddleware
from backend.middleware.rate_limit import RateLimitMiddleware, RateLimiter
from backend.middleware.error_handler import register_exception_handlers
from backend.middleware.logging import RequestContextLogMiddleware
from backend.models import news, user  # noqa: F401 - imported for metadata registration
from backend.models.database import Base, dispose_engine, get_session, validate_connection
from backend.routes import auth_router, email_router, health_router, news_router, preferences_router
from backend.utils.logger import configure_logging, get_logger

configure_logging(settings)
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
)

# Middleware configuration
app.add_middleware(RequestContextLogMiddleware)
app.add_middleware(JWTAuthMiddleware)
# Global rate limiter to complement endpoint-level limits
app.add_middleware(RateLimitMiddleware, limiter=RateLimiter())
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def register_routes(application: FastAPI) -> None:
    """Attach versioned API routers to the FastAPI application."""

    api_router = APIRouter(prefix=settings.api_v1_prefix)
    api_router.include_router(health_router)
    api_router.include_router(auth_router)
    api_router.include_router(news_router)
    api_router.include_router(preferences_router)
    api_router.include_router(email_router)

    application.include_router(api_router)


register_exception_handlers(app)
register_routes(app)


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


__all__ = ["app", "Base"]
