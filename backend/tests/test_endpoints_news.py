import asyncio
from datetime import date

import fakeredis.aioredis
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.schema import CreateTable
from sqlalchemy.pool import StaticPool

from pathlib import Path
import sys
import os

os.environ.setdefault("PAPERBOI_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from main import app
from backend.dependencies import get_db_session, get_gdelt_service, get_redis
from backend.models.database import Base
from backend.models.news import NewsArticle
from backend.services.gdelt_service import GDELTService


@pytest.fixture
def client() -> TestClient:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis_client = fakeredis.aioredis.FakeRedis()

    async def init_db() -> None:
        async with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                await conn.execute(CreateTable(table))
        async with session_factory() as session:
            article = NewsArticle(
                title="Sample technology article",
                url="https://example.com/article",
                domain="example.com",
                source="Example",
                published_date=date.today(),
                content="Content",
                tone="0.1",
                location="US",
                language="en",
            )
            session.add(article)
            await session.commit()

    asyncio.run(init_db())

    async def _get_db_session():
        async with session_factory() as session:
            yield session

    async def _get_redis():
        return redis_client

    app.dependency_overrides[get_db_session] = _get_db_session
    app.dependency_overrides[get_redis] = _get_redis

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides = {}
    asyncio.run(engine.dispose())


def test_list_news(client: TestClient) -> None:
    response = client.get("/api/v1/news")
    payload = response.json()
    assert response.status_code == 200
    assert payload["success"] is True
    assert isinstance(payload["data"], list)
    assert payload["pagination"]["total"] >= 1


def test_search_news(client: TestClient) -> None:
    response = client.post("/api/v1/news/search", json={"query": "technology"})
    payload = response.json()
    assert response.status_code == 200
    assert payload["success"] is True
    assert any("technology" in item["title"].lower() for item in payload["data"])


def test_fetch_fresh_maps_gdelt_article(client: TestClient) -> None:
    gdelt_payload = {
        "articles": [
            {
                "url": "https://example.com/article",
                "url_mobile": "https://m.example.com/article",
                "title": "AI growth story",
                "domain": "example.com",
                "seendate": "20240101123000",
                "socialimage": "https://example.com/image.jpg",
                "sourcecountry": "US",
                "sourcename": "Example News",
                "language": "en",
                "tone": 1.234,
            }
        ]
    }

    async def _get_gdelt_service():
        service = GDELTService(db_session=None, redis_client=fakeredis.aioredis.FakeRedis())
        service._execute_request = AsyncMock(return_value=gdelt_payload)
        service.save_articles_to_db = AsyncMock(return_value=[])
        return service

    app.dependency_overrides[get_gdelt_service] = _get_gdelt_service
    try:
        response = client.post("/api/v1/news/fetch-fresh", json={"query": "ai", "timespan": "1day"})
    finally:
        app.dependency_overrides.pop(get_gdelt_service, None)

    payload = response.json()
    assert response.status_code == 202
    assert payload["success"] is True
    assert payload["data"][0]["title"] == "AI growth story"
    assert payload["data"][0]["source"] == "Example News"
    assert payload["data"][0]["url"] == "https://example.com/article"
    assert payload["data"][0]["domain"] == "example.com"
    assert payload["data"][0]["published_date"] == "2024-01-01"
    assert payload["data"][0]["tone"] == "1.23"
    assert payload["data"][0]["location"] == "US"
    assert payload["data"][0]["language"] == "en"
