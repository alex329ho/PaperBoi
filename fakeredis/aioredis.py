"""Minimal async-compatible in-memory Redis stub for tests."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Set


class FakeRedis:
    """Simplified stand-in for ``fakeredis.aioredis.FakeRedis``."""

    def __init__(self, decode_responses: bool | None = None):
        self._decode_responses = decode_responses
        self._data: Dict[str, Any] = {}
        self._sets: Dict[str, Set[Any]] = defaultdict(set)
        self._lists: Dict[str, list[Any]] = defaultdict(list)

    async def get(self, key: str) -> Any:
        return self._data.get(key)

    async def set(self, key: str, value: Any, ex: int | None = None) -> bool:
        self._data[key] = value
        return True

    async def setex(self, key: str, time: int, value: Any) -> bool:  # noqa: A003
        self._data[key] = value
        return True

    async def incr(self, key: str) -> int:
        value = int(self._data.get(key, 0)) + 1
        self._data[key] = value
        return value

    async def expire(self, key: str, seconds: int) -> bool:
        # Expiry semantics are not required for current tests.
        return key in self._data

    async def sismember(self, key: str, value: Any) -> bool:
        return value in self._sets[key]

    async def sadd(self, key: str, value: Any) -> int:
        before = len(self._sets[key])
        self._sets[key].add(value)
        return 1 if len(self._sets[key]) > before else 0

    async def rpush(self, key: str, *values: Any) -> int:
        self._lists[key].extend(values)
        return len(self._lists[key])

    async def lrange(self, key: str, start: int, end: int) -> list[Any]:
        items = self._lists.get(key, [])
        if end == -1:
            end = len(items) - 1
        return items[start : end + 1]

    async def delete(self, *keys: str) -> int:
        removed = 0
        for key in keys:
            if key in self._data:
                del self._data[key]
                removed += 1
            if key in self._sets:
                del self._sets[key]
                removed += 1
            if key in self._lists:
                del self._lists[key]
                removed += 1
        return removed

    async def ping(self) -> bool:
        return True

    async def flushdb(self, asynchronous: bool | None = None) -> bool:
        self._data.clear()
        self._sets.clear()
        return True

    async def flushall(self) -> bool:
        return await self.flushdb()

    async def close(self) -> None:
        return None

    async def aclose(self) -> None:
        return None


__all__ = ["FakeRedis"]
