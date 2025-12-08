"""Database initialization helpers."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from backend.models import email_log, news, user  # noqa: F401 - ensure metadata registration
from backend.models.database import Base, engine


async def init_db(custom_engine: AsyncEngine | None = None) -> None:
    """Initialize database schema for local development.

    This helper is intentionally lightweight to keep compatibility with schema
    migrations. Alembic should be used in production environments to evolve the
    schema over time.
    """

    engine_to_use = custom_engine or engine
    async with engine_to_use.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
