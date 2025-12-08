"""OpenRouter-based news summarization service.

Example response payload returned by the OpenRouter API::

    {
      "id": "gen-123",
      "choices": [
        {
          "finish_reason": "stop",
          "message": {
            "content": "Summary text here...",
            "role": "assistant"
          }
        }
      ],
      "usage": {
        "prompt_tokens": 150,
        "completion_tokens": 100,
        "total_tokens": 250
      }
    }
"""
from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

import httpx
from redis.asyncio import Redis

from backend.config import settings
from backend.schemas.openrouter import ChatCompletionRequest, ChatCompletionResponse, ChatMessage
from backend.services.exceptions import (
    OpenRouterAuthenticationError,
    OpenRouterError,
    OpenRouterRateLimitError,
    OpenRouterResponseError,
    OpenRouterServiceUnavailableError,
)
from backend.utils.cost_tracker import CostTracker
from backend.utils.logger import get_logger
from backend.utils.retry_handler import execute_with_retry
from backend.utils.token_counter import approx_token_count, count_tokens_for_messages


class OpenRouterService:
    """Service wrapper around OpenRouter's Grok-4.1-fast model."""

    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    DEFAULT_MODEL = "x-ai/grok-4.1-fast"
    CACHE_TTL_SECONDS = 60 * 60 * 24 * 30
    RATE_LIMIT_BUFFER_SECONDS = 1

    LENGTH_TEMPLATES = {
        "SHORT": "Summarize the following news article in 1-2 sentences. Focus on the main news.",
        "MEDIUM": "Summarize the following news article in 3-5 sentences. Include key facts and context.",
        "LONG": "Summarize the following news article in 6-10 sentences. Provide comprehensive overview.",
    }

    def __init__(
        self,
        redis_client: Redis,
        *,
        api_key: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        cost_tracker: Optional[CostTracker] = None,
        request_timeout: int = 60,
        rate_limit_per_minute: int = 60,
        cache_ttl_seconds: int = CACHE_TTL_SECONDS,
    ) -> None:
        self.redis = redis_client
        self.api_key = api_key or settings.openrouter_api_key
        self.http_client = http_client or httpx.AsyncClient(timeout=request_timeout)
        self.cost_tracker = cost_tracker or CostTracker()
        self.request_timeout = request_timeout
        self.rate_limit_per_minute = rate_limit_per_minute
        self.cache_ttl_seconds = cache_ttl_seconds
        self.logger = get_logger(__name__)

        self._rate_limit_lock = asyncio.Lock()
        self._request_timestamps: List[datetime] = []

    async def summarize(
        self,
        text: str,
        title: str,
        length: str,
        *,
        article_id: Optional[str] = None,
        stream: bool = False,
    ) -> str:
        """Summarize an article using OpenRouter.

        Parameters
        ----------
        text:
            Article body to summarize.
        title:
            Article headline for additional context.
        length:
            Desired summary length: ``SHORT``, ``MEDIUM``, or ``LONG``.
        article_id:
            Unique identifier used for caching. Falls back to a stable hash
            derived from title and text when not provided.
        stream:
            When true, uses streaming responses for lower latency while still
            returning the final aggregated summary.
        """

        template = self.LENGTH_TEMPLATES.get(length.upper())
        if not template:
            raise ValueError("Invalid summary length. Choose SHORT, MEDIUM, or LONG.")

        if not self.api_key:
            raise OpenRouterAuthenticationError("OpenRouter API key is not configured")

        cache_key = self._build_cache_key(article_id or self._hash_article(title, text), length)
        cached = await self._get_cached_summary(cache_key)
        if cached:
            self.logger.info("Cache hit for summary", extra={"length": length, "cache_key": cache_key})
            return cached["summary"]

        try:
            await self._enforce_rate_limit()
            prompt = self._build_prompt(template, title, text)
            request = self._build_request(prompt, stream=stream, length=length)
            response = await self._execute_request(request, stream=stream)
            summary = self._extract_summary(response)
            await self._cache_summary(cache_key, summary, response.usage.model_dump())
            self._record_usage(response)
            return summary
        except OpenRouterError as exc:
            self.logger.error("OpenRouter summarization failed", extra={"error": str(exc), "length": length})
            cached = await self._get_cached_summary(cache_key)
            if cached:
                return cached["summary"]
            return self._fallback_summary(text)

    async def batch_summarize(self, articles: List[Dict[str, Any]], length: str) -> List[str]:
        """Summarize multiple articles concurrently."""

        tasks = [
            self.summarize(article.get("content", ""), article.get("title", ""), length, article_id=str(article.get("id")))
            for article in articles
        ]
        return await asyncio.gather(*tasks)

    def get_token_usage(self) -> Dict[str, Dict[str, int]]:
        """Return aggregated token usage metrics."""

        return self.cost_tracker.get_token_usage()

    def reset_usage_tracking(self) -> None:
        """Reset token usage counters."""

        self.cost_tracker.reset_usage_tracking()

    async def validate_api_key(self) -> bool:
        """Validate the configured OpenRouter API key by issuing a minimal request."""

        if not self.api_key:
            return False

        probe_request = ChatCompletionRequest(
            model=self.DEFAULT_MODEL,
            messages=[
                ChatMessage(role="system", content="You are a news summarizer. Create concise, factual summaries."),
                ChatMessage(role="user", content="Health check"),
            ],
            max_tokens=1,
        )

        try:
            await self._execute_request(probe_request)
        except OpenRouterAuthenticationError:
            return False
        except OpenRouterError:
            # Non-authentication errors are treated as transient
            return True
        return True

    def _build_cache_key(self, article_id: str, length: str) -> str:
        return f"summary:{article_id}:{length.upper()}"

    @staticmethod
    def _hash_article(title: str, text: str) -> str:
        payload = (title or "") + "::" + (text or "")
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()

    async def _get_cached_summary(self, cache_key: str) -> Optional[Dict[str, Any]]:
        cached = await self.redis.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                self.logger.warning("Failed to decode cached summary", extra={"cache_key": cache_key})
        return None

    async def _cache_summary(self, cache_key: str, summary: str, metadata: Dict[str, Any]) -> None:
        payload = {"summary": summary, "metadata": metadata, "timestamp": datetime.utcnow().isoformat()}
        await self.redis.set(cache_key, json.dumps(payload), ex=self.cache_ttl_seconds)

    def _fallback_summary(self, text: str) -> str:
        sentences = [sentence.strip() for sentence in text.split(".") if sentence.strip()]
        return ". ".join(sentences[:3]) + ("." if sentences else "")

    def _build_prompt(self, template: str, title: str, text: str) -> str:
        approx_tokens = approx_token_count(text)
        if approx_tokens > 6000:
            self.logger.info(
                "Large article detected; shortening prompt", extra={"approx_tokens": approx_tokens, "title": title}
            )
            text = text[:12000]
        return f"{template}\n\nTitle: {title}\n\nArticle:\n{text}"

    def _build_request(self, prompt: str, *, stream: bool, length: str) -> ChatCompletionRequest:
        max_tokens = {
            "SHORT": 50,
            "MEDIUM": 150,
            "LONG": 300,
        }.get(length.upper(), 150)

        return ChatCompletionRequest(
            model=self.DEFAULT_MODEL,
            messages=[
                ChatMessage(role="system", content="You are a news summarizer. Create concise, factual summaries."),
                ChatMessage(role="user", content=prompt),
            ],
            temperature=0.7,
            max_tokens=max_tokens,
            top_p=0.9,
            stream=stream,
        )

    async def _execute_request(self, request: ChatCompletionRequest, *, stream: bool = False) -> ChatCompletionResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async def _send() -> ChatCompletionResponse:
            if stream:
                async with self.http_client.stream(
                    "POST",
                    self.API_URL,
                    headers=headers,
                    json=request.model_dump(exclude_none=True),
                    timeout=self.request_timeout,
                ) as response:
                    await self._handle_errors(response)
                    body = "".join([chunk async for chunk in response.aiter_text()])
            else:
                response = await self.http_client.post(
                    self.API_URL,
                    headers=headers,
                    json=request.model_dump(exclude_none=True),
                    timeout=self.request_timeout,
                )
                await self._handle_errors(response)
                body = response.text

            try:
                data = json.loads(body)
            except json.JSONDecodeError as exc:  # pragma: no cover - safety
                raise OpenRouterResponseError("Failed to decode OpenRouter response", details=str(exc)) from exc

            try:
                return ChatCompletionResponse.model_validate(data)
            except Exception as exc:  # pragma: no cover - safety
                raise OpenRouterResponseError("Response validation failed", details=str(exc)) from exc

        try:
            return await execute_with_retry(
                _send,
                (httpx.TimeoutException, httpx.TransportError),
                retries=3,
                base_delay=1,
                backoff_factor=2,
                max_delay=10,
                logger=self.logger,
            )
        except OpenRouterError:
            raise
        except Exception as exc:  # pragma: no cover - safety
            raise OpenRouterError("Unexpected error during OpenRouter request", details=str(exc)) from exc

    async def _handle_errors(self, response: httpx.Response) -> None:
        if response.status_code == 401:
            raise OpenRouterAuthenticationError("Invalid OpenRouter API key")
        if response.status_code == 429:
            raise OpenRouterRateLimitError("OpenRouter rate limit exceeded")
        if response.status_code == 503:
            raise OpenRouterServiceUnavailableError("OpenRouter service unavailable")
        if response.status_code >= 500:
            raise OpenRouterServiceUnavailableError(
                f"OpenRouter returned server error: {response.status_code}", details=response.text
            )
        if response.status_code >= 400:
            raise OpenRouterResponseError(
                f"OpenRouter returned client error: {response.status_code}", details=response.text
            )

    def _extract_summary(self, response: ChatCompletionResponse) -> str:
        if not response.choices:
            raise OpenRouterResponseError("OpenRouter returned no choices")
        return response.choices[0].message.content.strip()

    def _record_usage(self, response: ChatCompletionResponse) -> None:
        usage = response.usage
        self.cost_tracker.record_usage(self.DEFAULT_MODEL, usage.prompt_tokens, usage.completion_tokens)

    async def _enforce_rate_limit(self) -> None:
        async with self._rate_limit_lock:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=60)
            self._request_timestamps = [ts for ts in self._request_timestamps if ts > window_start]
            if len(self._request_timestamps) >= self.rate_limit_per_minute:
                sleep_for = (self._request_timestamps[0] - window_start).total_seconds() + self.RATE_LIMIT_BUFFER_SECONDS
                self.logger.info("Rate limit reached; sleeping", extra={"sleep_for": sleep_for})
                await asyncio.sleep(max(sleep_for, 0))
            self._request_timestamps.append(datetime.utcnow())

    def _estimate_prompt_tokens(self, messages: Iterable[str]) -> int:
        return count_tokens_for_messages(messages)
