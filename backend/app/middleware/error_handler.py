"""Global error handling for the PaperBoi API."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.utils.exceptions import PaperBoiException

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach exception handlers to the FastAPI application."""

    @app.exception_handler(PaperBoiException)
    async def handle_custom_exceptions(request: Request, exc: PaperBoiException) -> JSONResponse:  # noqa: D401
        """Handle domain-specific exceptions and preserve status codes."""
        logger.warning("Handled PaperBoi exception: %s", exc.detail, extra={"request_id": getattr(request.state, "request_id", "")})
        payload: dict[str, Any] = {"detail": exc.detail, "error_code": exc.error_code}
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(RequestValidationError)
    @app.exception_handler(ValidationError)
    async def handle_validation_errors(request: Request, exc: Exception) -> JSONResponse:  # type: ignore[override]
        logger.debug(
            "Validation error on %s", request.url.path, extra={"request_id": getattr(request.state, "request_id", "")}
        )
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def handle_unexpected_errors(request: Request, exc: Exception) -> JSONResponse:  # noqa: D401
        """Handle any uncaught exceptions to avoid leaking internals."""
        logger.exception(
            "Unhandled exception: %s", exc, extra={"request_id": getattr(request.state, "request_id", "")}
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
