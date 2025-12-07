"""Database initialization utilities."""
from __future__ import annotations

from backend.models import email_log, news, user  # noqa: F401 - imported for metadata registration
from backend.models.database import Base, close_engine, get_db_session, get_engine, init_engine


async def init_database(create_schema: bool = False) -> None:
    """Initialize the database connection and optionally create tables.

    The function initializes the async engine and, when requested, creates the
    schema. In production deployments schema migrations should be handled by
    Alembic, but this helper is convenient for local development and automated tests.
    """

    await init_engine()

    if create_schema:
        engine = get_engine()
        async with engine.begin() as conn:  # pragma: no cover - integration path
            await conn.run_sync(Base.metadata.create_all)
