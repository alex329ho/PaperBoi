"""Request rate limiting utilities."""
from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from typing import Callable, Tuple

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from backend.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Token bucket rate limiter backed by Redis with in-memory fallback."""

    def __init__(self, redis_client: Redis | None = None, *, max_per_minute: int | None = None) -> None:
        self.redis = redis_client
        self.max_per_minute = max_per_minute or settings.api_rate_limit_per_minute
        self._local_counters: dict[Tuple[str, str], list[int]] = {}

    async def _increment_local(self, key: Tuple[str, str]) -> int:
        now = int(datetime.now(timezone.utc).timestamp())
        window_start = now - 60
        events = self._local_counters.setdefault(key, [])
        # drop events outside window
        self._local_counters[key] = [ts for ts in events if ts >= window_start]
        self._local_counters[key].append(now)
        return len(self._local_counters[key])

    async def _increment_redis(self, identifier: str, endpoint: str) -> int:
        assert self.redis is not None
        key = f"ratelimit:{identifier}:{endpoint}"
        pipeline = self.redis.pipeline()
        pipeline.zremrangebyscore(key, 0, int(self._now_ts()) - 60)
        pipeline.zadd(key, {str(self._now_ts()): self._now_ts()})
        pipeline.zcard(key)
        pipeline.expire(key, 120)
        _, _, count, _ = await pipeline.execute()
        return int(count)

    @staticmethod
    def _now_ts() -> int:
        return int(datetime.now(timezone.utc).timestamp())

    async def increment(self, identifier: str, endpoint: str) -> int:
        """Increment the request counter and return the current usage."""

        if self.redis:
            try:
                return await self._increment_redis(identifier, endpoint)
            except Exception:  # noqa: BLE001
                logger.warning("Falling back to in-memory rate limiting", extra={"endpoint": endpoint})
        return await self._increment_local((identifier, endpoint))

    async def enforce(self, identifier: str, endpoint: str) -> None:
        count = await self.increment(identifier, endpoint)
        if count > self.max_per_minute:
            reset_seconds = 60 - (self._now_ts() % 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(self.max_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(reset_seconds),
                },
            )

    def dependency(self, endpoint: str) -> Callable[[Request], asyncio.Future[None]]:
        async def _checker(request: Request) -> None:
            identifier = "anonymous"
            if getattr(request.state, "token_payload", None):
                identifier = str(request.state.token_payload.get("sub", "anonymous"))
            await self.enforce(identifier, endpoint)

        return _checker


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware that enforces a global request rate across all endpoints."""

    def __init__(self, app, limiter: RateLimiter) -> None:  # type: ignore[override]
        super().__init__(app)
        self.limiter = limiter

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:  # type: ignore[override]
        identifier = request.headers.get("X-User-ID") or "anonymous"
        try:
            await self.limiter.enforce(identifier, "global")
        except HTTPException as exc:
            return Response(status_code=exc.status_code, content=exc.detail)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limiter.max_per_minute)
        return response

__all__ = ["RateLimiter", "RateLimitMiddleware"]
