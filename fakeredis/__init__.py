"""Lightweight in-repo stub of the ``fakeredis`` package for tests.

This stub provides only the minimal async API surface used by the backend
integration tests, avoiding the need for the external dependency when the
network is unavailable.
"""

from .aioredis import FakeRedis

__all__ = ["FakeRedis"]
