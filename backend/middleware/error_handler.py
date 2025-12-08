"""Global exception handlers for FastAPI."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

from backend.utils.exceptions import ApplicationError
from backend.utils.logger import get_logger, get_request_id

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI application."""

    @app.exception_handler(ApplicationError)
    async def handle_application_error(request: Request, exc: ApplicationError) -> JSONResponse:  # type: ignore[override]
        logger.warning(
            "Handled application error",
            extra={"path": request.url.path, "error": exc.message, "request_id": get_request_id()},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code, "request_id": get_request_id()},
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:  # type: ignore[override]
        logger.error(
            "HTTP error response",
            extra={"path": request.url.path, "status": exc.status_code, "request_id": get_request_id()},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": get_request_id()},
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:  # type: ignore[override]
        logger.exception(
            "Unhandled server error",
            extra={"path": request.url.path, "request_id": get_request_id()},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "request_id": get_request_id()},
        )
