"""Database session and engine configuration."""
from __future__ import annotations

import ssl
from typing import Any, AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models to share metadata for migrations."""


def _build_connect_args() -> dict[str, Any]:
    """Create SSL connection arguments based on configuration."""

    if settings.database_ssl_mode == "disable":
        return {}

    if settings.database_ssl_mode == "require":
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return {"ssl": context}

    # prefer and verify-full use the default validation behavior
    return {"ssl": ssl.create_default_context()}


engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    connect_args=_build_connect_args(),
)

# Async session factory for request-scoped sessions
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""

    session = AsyncSessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def validate_connection() -> None:
    """Validate database connectivity by executing a lightweight query."""

    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def dispose_engine() -> None:
    """Dispose engine connections to support graceful shutdown."""

    await engine.dispose()
