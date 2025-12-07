"""Unit tests for the :mod:`services.gdelt_service` module."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock

import fakeredis.aioredis
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import sys

# Ensure project root is on the import path for module resolution
sys.path.append(str(Path(__file__).resolve().parents[1]))

from models.database import Base  # noqa: E402
from models.news import NewsArticle  # noqa: E402
from services.gdelt_service import GDELTService  # noqa: E402
from services.exceptions import GDELTInvalidParameterError  # noqa: E402


@pytest.fixture()
async def redis_client():
    client = fakeredis.aioredis.FakeRedis()
    try:
        yield client
    finally:
        await client.aclose()


@pytest.fixture()
async def db_session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session

    await engine.dispose()


@pytest.fixture()
async def service(db_session: AsyncSession, redis_client: fakeredis.aioredis.FakeRedis) -> GDELTService:
    return GDELTService(db_session=db_session, redis_client=redis_client)


@pytest.mark.asyncio()
async def test_validate_query_parameters_success(service: GDELTService) -> None:
    assert service.validate_query_parameters("technology", "1day", "US", "en")


@pytest.mark.asyncio()
async def test_validate_query_parameters_failure(service: GDELTService) -> None:
    with pytest.raises(GDELTInvalidParameterError):
        service.validate_query_parameters("", "1day", "USA", "english")


@pytest.mark.asyncio()
async def test_parse_gdelt_response(service: GDELTService) -> None:
    payload = {
        "articles": [
            {
                "url": "https://example.com/article",
                "url_mobile": "https://m.example.com/article",
                "title": "Sample",
                "domain": "example.com",
                "seendate": "20240101010101",
                "socialimage": "https://example.com/image.jpg",
                "sourcecountry": "US",
                "sourcename": "Example",
                "language": "en",
                "tone": -1.5,
            }
        ]
    }

    parsed = service.parse_gdelt_response(payload)
    assert parsed[0]["title"] == "Sample"
    assert parsed[0]["url"] == "https://example.com/article"
    assert parsed[0]["tone"] == "-1.50"


@pytest.mark.asyncio()
async def test_fetch_news_uses_cache(service: GDELTService, redis_client: fakeredis.aioredis.FakeRedis) -> None:
    response_payload = {
        "articles": [
            {
                "url": "https://example.com/1",
                "title": "Story 1",
                "domain": "example.com",
                "seendate": "20240101000000",
                "sourcecountry": "US",
                "sourcename": "Example",
                "language": "en",
            }
        ]
    }

    service._execute_request = AsyncMock(return_value=response_payload)

    first = await service.fetch_news("test", timespan="1day")
    second = await service.fetch_news("test", timespan="1day")

    assert first == second
    service._execute_request.assert_awaited_once()


@pytest.mark.asyncio()
async def test_save_articles_to_db_deduplicates(service: GDELTService, db_session: AsyncSession) -> None:
    articles = [
        {
            "title": "Story",
            "url": "https://example.com/unique",
            "domain": "example.com",
            "source": "Example",
            "published_date": datetime.utcnow().date(),
            "content": None,
            "tone": None,
            "location": "US",
            "language": "en",
        },
        {
            "title": "Story",
            "url": "https://example.com/unique",
            "domain": "example.com",
            "source": "Example",
            "published_date": datetime.utcnow().date(),
            "content": None,
            "tone": None,
            "location": "US",
            "language": "en",
        },
    ]

    saved = await service.save_articles_to_db(articles)
    assert len(saved) == 1

    result = await db_session.execute(select(NewsArticle))
    assert len(result.scalars().all()) == 1


@pytest.mark.asyncio()
async def test_fetch_news_by_date_builds_params(service: GDELTService) -> None:
    service._execute_request = AsyncMock(return_value={"articles": []})
    start = datetime.utcnow() - timedelta(days=1)
    end = datetime.utcnow()

    await service.fetch_news_by_date("finance", start, end)
    service._execute_request.assert_awaited_once()
