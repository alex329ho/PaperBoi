"""Minimal asyncio-compatible Redis client stub."""

from __future__ import annotations

from fakeredis.aioredis import FakeRedis


class Redis(FakeRedis):
    """Drop-in stand-in for ``redis.asyncio.Redis`` built on the FakeRedis stub."""

    @classmethod
    def from_url(cls, *_: str, decode_responses: bool | None = None, **__: object) -> "Redis":
        return cls(decode_responses=decode_responses)


__all__ = ["Redis"]
