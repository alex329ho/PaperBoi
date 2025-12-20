"""Lightweight stub of the ``redis`` package to support tests offline."""

from .asyncio import Redis

__all__ = ["Redis"]
