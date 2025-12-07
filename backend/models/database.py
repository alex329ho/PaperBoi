"""Database configuration and session management for the application."""
from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings
from backend.utils.exceptions import DatabaseConnectionError


class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Retrieve the initialized SQLAlchemy async engine.

    Raises:
        DatabaseConnectionError: If the engine has not been created yet.
    """

    if _engine is None:
        raise DatabaseConnectionError("Database engine not initialized")
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the configured session factory.

    Raises:
        DatabaseConnectionError: If the session factory is not ready.
    """

    if _session_factory is None:
        raise DatabaseConnectionError("Session factory not initialized")
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session."""

    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session


async def init_engine() -> None:
    """Initialize the async engine and session factory with pooling.

    Connection pooling is configured to use a fixed pool size with no overflow in
    order to keep resource usage predictable in constrained environments.
    """

    global _engine, _session_factory
    if _engine is not None and _session_factory is not None:
        return

    _engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        connect_args={"sslmode": settings.database_ssl_mode},
        future=True,
    )
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    await validate_connection()


async def validate_connection() -> None:
    """Validate that the database connection can be established."""

    engine = get_engine()
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:  # pragma: no cover - defensive
        msg = f"Unable to connect to the database: {exc}"
        raise DatabaseConnectionError(msg) from exc


async def close_engine() -> None:
    """Dispose of the async engine and clear the session factory."""

    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
    _session_factory = None
