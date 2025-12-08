"""Unit tests for the OpenRouterService summarization flow."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import fakeredis.aioredis
import pytest
import pytest_asyncio

import sys

# Ensure project root on path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from schemas.openrouter import ChatChoice, ChatCompletionResponse, ChatMessage, UsageStats  # noqa: E402
from services.exceptions import OpenRouterServiceUnavailableError  # noqa: E402
from services.openrouter_service import OpenRouterService  # noqa: E402


@pytest_asyncio.fixture()
async def redis_client():
    client = fakeredis.aioredis.FakeRedis()
    try:
        yield client
    finally:
        await client.aclose()


def build_response(summary: str) -> ChatCompletionResponse:
    return ChatCompletionResponse(
        id="gen-123",
        choices=[ChatChoice(finish_reason="stop", message=ChatMessage(role="assistant", content=summary))],
        usage=UsageStats(prompt_tokens=100, completion_tokens=20, total_tokens=120),
    )


@pytest.mark.asyncio()
async def test_summarize_caches_response(redis_client: fakeredis.aioredis.FakeRedis) -> None:
    service = OpenRouterService(redis_client=redis_client, api_key="test")
    service._execute_request = AsyncMock(return_value=build_response("cached summary"))

    first = await service.summarize("content", "title", "SHORT", article_id="1")
    second = await service.summarize("content", "title", "SHORT", article_id="1")

    assert first == "cached summary"
    assert second == "cached summary"
    service._execute_request.assert_awaited_once()


@pytest.mark.asyncio()
async def test_summarize_uses_fallback_on_failure(redis_client: fakeredis.aioredis.FakeRedis) -> None:
    service = OpenRouterService(redis_client=redis_client, api_key="test")
    service._execute_request = AsyncMock(side_effect=OpenRouterServiceUnavailableError("down"))

    text = "Sentence one. Sentence two. Sentence three. Sentence four."
    summary = await service.summarize(text, "title", "MEDIUM", article_id="2")

    assert "Sentence one" in summary
    assert service._execute_request.await_count == 1


@pytest.mark.asyncio()
async def test_validate_api_key_handles_authentication(redis_client: fakeredis.aioredis.FakeRedis) -> None:
    service = OpenRouterService(redis_client=redis_client, api_key="test")
    service._execute_request = AsyncMock(side_effect=[OpenRouterServiceUnavailableError("transient"), build_response("ok")])

    assert await service.validate_api_key() is True


@pytest.mark.asyncio()
async def test_batch_summarize(redis_client: fakeredis.aioredis.FakeRedis) -> None:
    service = OpenRouterService(redis_client=redis_client, api_key="test")
    service.summarize = AsyncMock(side_effect=["one", "two"])  # type: ignore[assignment]

    articles = [
        {"id": 1, "title": "a", "content": "x"},
        {"id": 2, "title": "b", "content": "y"},
    ]

    summaries = await service.batch_summarize(articles, "SHORT")
    assert summaries == ["one", "two"]
    assert service.summarize.await_count == 2
