from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path

import fakeredis.aioredis
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.schema import CreateTable

sys.path.append(str(Path(__file__).resolve().parents[1].parent))

from backend.models.database import Base
from backend.models.email_log import EmailLog
from backend.models.news import NewsArticle, Summary
from backend.models.user import User, UserPreferences
from backend.tasks import jobs


@pytest_asyncio.fixture()
async def in_memory_session_factory() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            await conn.execute(CreateTable(table))
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture()
async def redis_client() -> fakeredis.aioredis.FakeRedis:
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    await client.flushdb()
    return client


class StubGdeltService:
    def __init__(self, *_: object, **__: object) -> None:
        self.calls: list[str] = []

    async def fetch_news(self, query: str, timespan: str = "8hours", region: str | None = None):
        self.calls.append(query)
        return [
            {"title": f"{query} headline", "url": f"https://{query}.com", "content": "text"},
            {"title": f"{query} duplicate", "url": f"https://{query}.com", "content": "text"},
        ]


class StubSummarizer:
    DEFAULT_MODEL = "stub-model"

    def __init__(self, *_: object, **__: object) -> None:
        self.calls: list[str] = []

    async def summarize(self, text: str, title: str, length: str, article_id: str | None = None) -> str:  # noqa: D401
        self.calls.append(title)
        return f"summary for {title}"


@pytest.mark.asyncio
async def test_fetch_daily_news_deduplicates(in_memory_session_factory: async_sessionmaker[AsyncSession], redis_client: fakeredis.aioredis.FakeRedis) -> None:  # noqa: E501
    async with in_memory_session_factory() as session:
        user = User(email="a@example.com", password_hash="x")
        session.add(user)
        await session.flush()
        session.add(UserPreferences(user_id=user.id, topics=["tech"], regions=["us"]))
        await session.commit()

    stats = await jobs.fetch_daily_news(
        session_factory=in_memory_session_factory,
        redis_client=redis_client,
        gdelt_service_factory=lambda session, redis: StubGdeltService(),
    )
    assert stats["new_articles"] == 1


@pytest.mark.asyncio
async def test_generate_daily_summaries_creates_entries(
    in_memory_session_factory: async_sessionmaker[AsyncSession], redis_client: fakeredis.aioredis.FakeRedis
) -> None:
    async with in_memory_session_factory() as session:
        article = NewsArticle(title="Hello", url="https://example.com", content="body")
        session.add(article)
        await session.commit()

    stats = await jobs.generate_daily_summaries(
        session_factory=in_memory_session_factory,
        redis_client=redis_client,
        summarizer_factory=lambda redis: StubSummarizer(),
    )
    assert stats["summaries_created"] == 1

    async with in_memory_session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(Summary))
    assert count == 1


@pytest.mark.asyncio
async def test_retry_failed_emails_updates_status(in_memory_session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with in_memory_session_factory() as session:
        user = User(email="retry@example.com", password_hash="x")
        session.add(user)
        await session.flush()
        log = EmailLog(user_id=user.id, recipients=[user.email], subject="Test", status="failed")
        session.add(log)
        await session.commit()

    class FakeEmailService:
        def send_batch_email(self, recipients, subject, html_content):  # noqa: D401
            return True

    stats = await jobs.retry_failed_emails(
        session_factory=in_memory_session_factory,
        email_service_factory=lambda: FakeEmailService(),
    )
    assert stats["recovered"] == 1

    async with in_memory_session_factory() as session:
        result = await session.scalar(select(EmailLog.status))
        assert result == "sent"
