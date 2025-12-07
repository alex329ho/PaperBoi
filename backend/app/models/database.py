"""Database session and engine management for PaperBoi."""
from __future__ import annotations

import logging
import ssl
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all ORM models."""


target_metadata = Base.metadata
engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None


async def init_engine() -> AsyncEngine:
    """Create the global async engine with connection pooling."""
    global engine, SessionLocal
    if engine is not None and SessionLocal is not None:
        return engine

    connect_args: dict[str, ssl.SSLContext] = {}
    if settings.database_ssl_enabled:
        connect_args["ssl"] = ssl.create_default_context()

    try:
        engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,
            future=True,
            pool_pre_ping=True,
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            connect_args=connect_args,
        )
        SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        logger.info("Database engine initialized with pool size %s", settings.database_pool_size)
        return engine
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to initialize database engine")
        raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a scoped async database session."""
    if SessionLocal is None:
        await init_engine()
    assert SessionLocal is not None  # for mypy
    session = SessionLocal()
    try:
        yield session
    finally:
        await session.close()


async def validate_database_connection() -> None:
    """Ping the database to ensure connectivity during startup."""
    eng = await init_engine()
    try:
        async with eng.connect() as connection:
            await connection.execute(text("SELECT 1"))
            logger.info("Database connectivity validated")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Database validation failed")
        raise RuntimeError("Database connection failed") from exc


async def shutdown_engine() -> None:
    """Dispose of the engine during graceful shutdown."""
    if engine is None:
        return
    try:
        await engine.dispose()
        logger.info("Database engine disposed")
    except Exception as exc:  # noqa: BLE001
        logger.exception("Error while disposing database engine")
        raise
