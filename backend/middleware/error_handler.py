"""Centralized error handling for the API."""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.utils.exceptions import ApplicationError
from backend.utils.logger import get_logger

logger = get_logger(__name__)


def _serialize_error(detail: Any, status_code: int, request_id: str | None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "request_id": request_id},
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the application instance."""

    @app.exception_handler(ApplicationError)
    async def handle_application_error(
        request: Request, exc: ApplicationError
    ) -> JSONResponse:
        logger.warning(
            "application.error",
            extra={"path": request.url.path, "detail": exc.detail, "request_id": getattr(request.state, "request_id", None)},
        )
        return _serialize_error(exc.detail, exc.status_code, getattr(request.state, "request_id", None))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.info(
            "validation.error",
            extra={"errors": exc.errors(), "request_id": getattr(request.state, "request_id", None)},
        )
        return _serialize_error(exc.errors(), 422, getattr(request.state, "request_id", None))

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        logger.info(
            "http.error",
            extra={"status_code": exc.status_code, "detail": exc.detail, "request_id": getattr(request.state, "request_id", None)},
        )
        return _serialize_error(exc.detail, exc.status_code, getattr(request.state, "request_id", None))

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:  # noqa: BLE001
        logger.exception(
            "unhandled.error",
            extra={"path": request.url.path, "request_id": getattr(request.state, "request_id", None)},
        )
        return _serialize_error(
            "An unexpected error occurred. Please try again later.", 500, getattr(request.state, "request_id", None)
        )
