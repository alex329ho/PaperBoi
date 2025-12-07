"""Request and response logging middleware."""
from __future__ import annotations

import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from utils.logger import get_logger, set_request_id

logger = get_logger(__name__)


class RequestContextLogMiddleware(BaseHTTPMiddleware):
    """Attach request identifiers and emit structured logs per request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:  # type: ignore[override]
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        set_request_id(request_id)

        start_time = time.perf_counter()
        logger.info("Received request", extra={"method": request.method, "path": request.url.path})

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.exception("Unhandled exception during request", extra={"duration_ms": duration_ms})
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "Request completed",
            extra={"status_code": response.status_code, "duration_ms": round(duration_ms, 2)},
        )

        # Clear context after the response has been sent to the client
        response.call_on_close(lambda: set_request_id(None))
        return response
