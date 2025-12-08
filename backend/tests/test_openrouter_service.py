"""Unit tests for the OpenRouter summarization service."""
from __future__ import annotations

from pathlib import Path
from typing import Dict
import sys

import httpx
import pytest
import pytest_asyncio
import fakeredis.aioredis

sys.path.append(str(Path(__file__).resolve().parents[1]))

from config import AppSettings  # noqa: E402
from services.openrouter_service import OpenRouterService  # noqa: E402


def build_transport(response_payload: Dict, status_code: int = 200) -> httpx.MockTransport:
    async def handler(request: httpx.Request) -> httpx.Response:  # noqa: D401
        return httpx.Response(status_code, json=response_payload)

    return httpx.MockTransport(handler)


@pytest.fixture()
def settings() -> AppSettings:
    return AppSettings(openrouter_api_key="test-key", api_rate_limit_per_minute=100)


@pytest_asyncio.fixture()
async def redis_client():
    client = fakeredis.aioredis.FakeRedis()
    try:
        yield client
    finally:
        await client.aclose()


@pytest.mark.asyncio()
async def test_summarize_caches_result(settings: AppSettings, redis_client: fakeredis.aioredis.FakeRedis) -> None:
    summary_text = "This is a concise summary."
    response_payload = {
        "id": "gen-1",
        "choices": [{"finish_reason": "stop", "message": {"content": summary_text, "role": "assistant"}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
    }

    transport = build_transport(response_payload)
    async with httpx.AsyncClient(transport=transport) as client:
        service = OpenRouterService(redis_client=redis_client, http_client=client, settings=settings)
        first = await service.summarize("Body text", "Title", "SHORT")
        second = await service.summarize("Body text", "Title", "SHORT")

    assert first == summary_text
    assert second == summary_text
    cached = await redis_client.get(service._cache_key(service._generate_digest("Title", "Body text"), "SHORT"))
    assert cached.decode("utf-8") == summary_text


@pytest.mark.asyncio()
async def test_validate_api_key_failure(settings: AppSettings, redis_client: fakeredis.aioredis.FakeRedis) -> None:
    response_payload = {"error": "Unauthorized"}
    transport = build_transport(response_payload, status_code=401)
    async with httpx.AsyncClient(transport=transport) as client:
        service = OpenRouterService(redis_client=redis_client, http_client=client, settings=settings)
        valid = await service.validate_api_key()

    assert not valid


@pytest.mark.asyncio()
async def test_fallback_on_network_error(settings: AppSettings, redis_client: fakeredis.aioredis.FakeRedis) -> None:
    async def handler(_: httpx.Request) -> httpx.Response:  # noqa: D401
        raise httpx.RequestError("boom", request=httpx.Request("POST", "https://example.com"))

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        service = OpenRouterService(redis_client=redis_client, http_client=client, settings=settings)
        summary = await service.summarize("Sentence one. Sentence two. Sentence three.", "Title", "SHORT")

    assert summary.startswith("Sentence one")


@pytest.mark.asyncio()
async def test_token_usage_tracking(settings: AppSettings, redis_client: fakeredis.aioredis.FakeRedis) -> None:
    summary_text = "Another summary."
    response_payload = {
        "id": "gen-2",
        "choices": [{"finish_reason": "stop", "message": {"content": summary_text, "role": "assistant"}}],
        "usage": {"prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30},
    }
    transport = build_transport(response_payload)
    async with httpx.AsyncClient(transport=transport) as client:
        service = OpenRouterService(redis_client=redis_client, http_client=client, settings=settings)
        await service.summarize("Body", "Title", "SHORT")
        usage = service.get_token_usage()

    assert usage["x-ai/grok-4.1-fast"]["prompt_tokens"] == 20
    assert usage["x-ai/grok-4.1-fast"]["completion_tokens"] == 10
