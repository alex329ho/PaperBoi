"""Request/response logging and rate limiting middleware."""
from __future__ import annotations

import asyncio
import time
import uuid

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from backend.config import settings
from backend.utils.logger import get_logger, request_id_ctx

logger = get_logger(__name__)

class RequestContextLogMiddleware(BaseHTTPMiddleware):
    """Attach a request ID and emit structured request/response logs."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(settings.request_id_header) or str(uuid.uuid4())
        request_id_ctx.set(request_id)
        request.state.request_id = request_id

        logger.info(
            "request.start",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else "unknown",
                "request_id": request_id,
            },
        )

        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request.error",
                extra={"path": request.url.path, "request_id": request_id},
            )
            raise

        response.headers[settings.request_id_header] = request_id
        logger.info(
            "request.complete",
            extra={
                "status_code": response.status_code,
                "path": request.url.path,
                "request_id": request_id,
            },
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple token bucket rate limiter backed by Redis when available."""

    def __init__(self, app: ASGIApp, redis_client: object | None = None) -> None:
        super().__init__(app)
        self.redis_client = redis_client
        self._lock = asyncio.Lock()
        self._local_counters: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Refresh Redis client reference on each request to pick up startup initialization.
        if not self.redis_client and hasattr(request.app.state, "redis"):
            self.redis_client = request.app.state.redis
        identifier = self._get_identifier(request)
        allowed = await self._is_allowed(identifier)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "request_id": request.state.request_id if hasattr(request.state, "request_id") else None,
                },
            )

        return await call_next(request)

    def _get_identifier(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    async def _is_allowed(self, identifier: str) -> bool:
        window = settings.rate_limit_window_seconds
        limit = settings.rate_limit_requests

        if self.redis_client:
            return await self._check_with_redis(identifier, limit, window)

        async with self._lock:
            now = time.monotonic()
            timestamps = self._local_counters.get(identifier, [])
            # Remove requests outside the window
            timestamps = [ts for ts in timestamps if now - ts <= window]
            if len(timestamps) >= limit:
                self._local_counters[identifier] = timestamps
                return False
            timestamps.append(now)
            self._local_counters[identifier] = timestamps
        return True

    async def _check_with_redis(self, identifier: str, limit: int, window: int) -> bool:
        # Redis operations are written defensively to avoid failing requests when
        # the cache is temporarily unavailable.
        redis = self.redis_client
        try:
            key = f"ratelimit:{identifier}:{window}"
            current = await redis.incr(key)
            if current == 1:
                await redis.expire(key, window)
            if current > limit:
                return False
        except Exception:
            logger.warning("Rate limiting degraded to local mode due to Redis error", exc_info=True)
            return True
        return True
