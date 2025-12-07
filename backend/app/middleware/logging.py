"""Request and response logging middleware with tracing support."""
from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger("paperboi.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log each request and response with timing and request ID."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        request_id = request.headers.get(settings.request_id_header) or str(uuid.uuid4())
        start_time = time.perf_counter()
        request.state.request_id = request_id

        logger.info(
            "Incoming request %s %s", request.method, request.url.path, extra={"request_id": request_id}
        )

        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled exception for %s", request.url.path, extra={"request_id": request_id})
            raise exc

        process_time = (time.perf_counter() - start_time) * 1000
        response.headers[settings.request_id_header] = request_id
        logger.info(
            "Response %s completed in %.2fms", response.status_code, process_time, extra={"request_id": request_id}
        )
        return response
