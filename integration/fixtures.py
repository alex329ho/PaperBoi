"""Shared fixtures and factories used by integration tests.

This module provides convenience helpers for constructing an isolated FastAPI
test application wired to in-memory databases, mock external services, and
seed data spanning both backend and mobile scenarios.
"""
from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Tuple

import fakeredis.aioredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.schema import CreateTable
from sqlalchemy.pool import StaticPool

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from backend.dependencies import (  # noqa: E402
    get_db_session,
    get_email_service,
    get_gdelt_service,
    get_redis,
    get_summarization_service,
)
from backend.main import app  # noqa: E402
from backend.models.database import Base  # noqa: E402
from backend.models.news import NewsArticle  # noqa: E402

# ---- Data factories ------------------------------------------------------- #


@dataclass
class UserCredentials:
    """Simple representation of a test user's credentials."""

    email: str
    password: str
    name: str = "Test User"


@dataclass
class PreferencePayload:
    """Model the preference structure expected by the API."""

    topics: list[str]
    regions: list[str]
    languages: list[str]
    notification_enabled: bool = True
    notification_time: str = "08:00"
    summary_length: str = "MEDIUM"
    email_frequency: str = "daily"

    def as_dict(self) -> Dict[str, Any]:
        return {
            "topics": self.topics,
            "regions": self.regions,
            "languages": self.languages,
            "notification_enabled": self.notification_enabled,
            "notification_time": self.notification_time,
            "summary_length": self.summary_length,
            "email_frequency": self.email_frequency,
        }


def article_payload(
    *,
    title: str = "Test Article",
    url: str = "https://example.com/article-1",
    domain: str = "example.com",
    source: str = "Example",
    location: str = "US",
    language: str = "en",
    published_date: date | None = None,
    tone: str = "0.0",
    content: str = "Sample content body",
) -> Dict[str, Any]:
    """Build a NewsArticle-compatible payload."""

    return {
        "title": title,
        "url": url,
        "domain": domain,
        "source": source,
        "published_date": published_date or date.today(),
        "content": content,
        "tone": tone,
        "location": location,
        "language": language,
    }


# ---- Mock service implementations ---------------------------------------- #


class DummyGDELTService:
    """Minimal stub returning deterministic article collections."""

    def __init__(self, responses: List[Dict[str, Any]]):
        self.responses = responses
        self.calls: list[Tuple[str, str | None]] = []
        self.fail_next: bool = False

    async def fetch_news(self, query: str, timespan: str = "8hours", region: str | None = None, language: str | None = None) -> List[Dict[str, Any]]:  # noqa: B008,E501
        if self.fail_next:
            self.fail_next = False
            raise RuntimeError("Simulated upstream outage")
        self.calls.append((query, region))
        return self.responses


class DummySummarizationService:
    """Fake summarizer used to avoid real OpenRouter traffic."""

    def __init__(self) -> None:
        self.calls: list[Dict[str, Any]] = []

    async def summarize_article(self, article: Dict[str, Any], length: str = "MEDIUM") -> str:
        summary = f"[{length}] {article.get('title', 'article')} :: {article.get('content', '')[:60]}"
        self.calls.append({"article": article.get("id"), "length": length, "summary": summary})
        return summary


@dataclass
class EmailRecord:
    """Lightweight email record representation compatible with the API schema."""

    id: str
    recipients: list[str]
    subject: str
    html_content: str
    sent_at: str
    status: str

    def model_dump(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "recipients": self.recipients,
            "subject": self.subject,
            "html_content": self.html_content,
            "sent_at": self.sent_at,
            "status": self.status,
        }


class DummyEmailService:
    """Capture email requests without hitting SMTP providers."""

    def __init__(self) -> None:
        self.delivery_log: Dict[str, EmailRecord] = {}

    async def _build_and_send_async(self, *, recipients: Iterable[str], subject: str, html_content: str) -> str:
        email_id = f"email-{len(self.delivery_log)+1}"
        self.delivery_log[email_id] = EmailRecord(
            id=email_id,
            recipients=list(recipients),
            subject=subject,
            html_content=html_content,
            sent_at=datetime.now(timezone.utc).isoformat(),
            status="queued",
        )
        return email_id

    def schedule_email(self, recipient: str, send_at: datetime) -> str:
        schedule_id = f"schedule-{len(self.delivery_log)+1}"
        self.delivery_log[schedule_id] = EmailRecord(
            id=schedule_id,
            recipients=[recipient],
            subject="scheduled",
            html_content="",
            sent_at=send_at.isoformat(),
            status="scheduled",
        )
        return schedule_id


# ---- Application factory -------------------------------------------------- #


@dataclass
class IntegrationApp:
    """Container returned by :func:`create_test_app`."""

    client: TestClient
    session_factory: async_sessionmaker
    redis: fakeredis.aioredis.FakeRedis
    gdelt_service: DummyGDELTService
    summarizer: DummySummarizationService
    email_service: DummyEmailService
    cleanup: Callable[[], None]


def create_test_app(seed_articles: List[Dict[str, Any]] | None = None) -> IntegrationApp:
    """Wire a FastAPI TestClient with in-memory dependencies.

    This mirrors the public API surface while bypassing network calls to
    Redis, GDELT, OpenRouter, and SMTP services.
    """

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis = fakeredis.aioredis.FakeRedis()

    async def init_db() -> None:
        async with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                await conn.execute(CreateTable(table))
        if seed_articles:
            async with session_factory() as session:
                for payload in seed_articles:
                    session.add(NewsArticle(**payload))
                await session.commit()

    asyncio.run(init_db())

    async def _get_db_session():
        async with session_factory() as session:
            yield session

    async def _get_redis():
        return redis

    gdelt_service = DummyGDELTService(seed_articles or [article_payload()])
    summarizer = DummySummarizationService()
    email_service = DummyEmailService()

    async def _get_gdelt_service():
        return gdelt_service

    async def _get_summarizer():
        return summarizer

    async def _get_email_service():
        return email_service

    app.dependency_overrides[get_db_session] = _get_db_session
    app.dependency_overrides[get_redis] = _get_redis
    app.dependency_overrides[get_gdelt_service] = _get_gdelt_service
    app.dependency_overrides[get_summarization_service] = _get_summarizer
    app.dependency_overrides[get_email_service] = _get_email_service

    client = TestClient(app)

    def _cleanup() -> None:
        app.dependency_overrides = {}
        asyncio.run(engine.dispose())

    return IntegrationApp(
        client=client,
        session_factory=session_factory,
        redis=redis,
        gdelt_service=gdelt_service,
        summarizer=summarizer,
        email_service=email_service,
        cleanup=_cleanup,
    )


@pytest.fixture
def integration_app() -> Iterable[IntegrationApp]:
    """Pytest fixture that yields a fully-wired integration environment."""

    app_ctx = create_test_app([article_payload(title="AI breakthroughs reshape economy")])
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        yield app_ctx
    finally:
        app_ctx.cleanup()
        loop.close()
        asyncio.set_event_loop(None)


def auth_headers(token: str) -> Dict[str, str]:
    """Format an Authorization header for convenience."""

    return {"Authorization": f"Bearer {token}"}


__all__ = [
    "IntegrationApp",
    "UserCredentials",
    "PreferencePayload",
    "article_payload",
    "auth_headers",
    "create_test_app",
    "integration_app",
]
