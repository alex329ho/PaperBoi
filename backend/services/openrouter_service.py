"""Service integration with OpenRouter for AI-powered summarization."""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import deque
from dataclasses import dataclass
from hashlib import sha256
from typing import Any, Dict, List, Literal

import httpx
from redis.asyncio import Redis

from config import AppSettings, get_settings
from schemas.openrouter import OpenRouterMessage, OpenRouterRequest, OpenRouterResponse
from utils.cost_tracker import CostTracker
from utils.logger import get_logger
from utils.token_counter import estimate_tokens

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_TIMEOUT = 60.0
CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
SUPPORTED_LENGTHS = Literal["SHORT", "MEDIUM", "LONG"]


class OpenRouterServiceError(Exception):
    """Base exception for OpenRouter service failures."""


class OpenRouterRateLimitError(OpenRouterServiceError):
    """Raised when local or remote rate limits prevent a request."""


class OpenRouterAuthenticationError(OpenRouterServiceError):
    """Raised when the OpenRouter API key is invalid or missing."""


class OpenRouterResponseError(OpenRouterServiceError):
    """Raised when an unexpected response payload is encountered."""


@dataclass
class SummaryResult:
    """Structured representation of a summarization result."""

    summary: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cached: bool = False
    timestamp: float | None = None


class OpenRouterService:
    """High-level client for interacting with the OpenRouter Grok model."""

    PROMPT_TEMPLATES: Dict[str, str] = {
        "SHORT": "Summarize the following news article in 1-2 sentences. Focus on the main news.",
        "MEDIUM": "Summarize the following news article in 3-5 sentences. Include key facts and context.",
        "LONG": "Summarize the following news article in 6-10 sentences. Provide comprehensive overview.",
    }

    MAX_TOKENS_BY_LENGTH: Dict[str, int] = {"SHORT": 50, "MEDIUM": 150, "LONG": 300}

    def __init__(
        self,
        *,
        redis_client: Redis | None = None,
        http_client: httpx.AsyncClient | None = None,
        cost_tracker: CostTracker | None = None,
        settings: AppSettings | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.api_key = self.settings.openrouter_api_key
        if not self.api_key:
            raise OpenRouterAuthenticationError("OpenRouter API key is not configured")

        self.redis_client = redis_client
        self.http_client = http_client or httpx.AsyncClient(timeout=DEFAULT_TIMEOUT)
        self.cost_tracker = cost_tracker or CostTracker(logger=logger)
        self.logger = logger or get_logger(self.__class__.__name__)
        self.rate_limit_per_minute = self.settings.api_rate_limit_per_minute
        self._request_timestamps: deque[float] = deque()

    async def summarize(
        self,
        text: str,
        title: str,
        length: SUPPORTED_LENGTHS,
        *,
        streaming: bool = False,
        article_id: str | None = None,
    ) -> str:
        """Generate a summary for a single article."""

        normalized_length = length.upper()
        if normalized_length not in self.PROMPT_TEMPLATES:
            raise ValueError(f"Unsupported summary length: {length}")

        cache_key = self._cache_key(article_id or self._generate_digest(title, text), normalized_length)
        cached = await self._get_cached_summary(cache_key)
        if cached is not None:
            self.logger.info("Cache hit for summary", extra={"length": normalized_length, "cache_key": cache_key})
            return cached

        await self._enforce_rate_limit()

        prompt_tokens = estimate_tokens([self.PROMPT_TEMPLATES[normalized_length], title, text])
        max_tokens = self.MAX_TOKENS_BY_LENGTH[normalized_length]

        normalized_length, max_tokens = self._adjust_length_for_budget(normalized_length, prompt_tokens, max_tokens)
        prompt = self.PROMPT_TEMPLATES[normalized_length]
        request_payload = self._build_request(prompt, title, text, max_tokens, streaming)

        try:
            response_body = await self._send_request(request_payload, streaming=streaming)
            result = self._handle_response(response_body, default_model=request_payload.model)
            await self._set_cached_summary(cache_key, result.summary)
            return result.summary
        except OpenRouterServiceError:
            cached_fallback = await self._get_cached_summary(cache_key)
            if cached_fallback:
                self.logger.warning("Returning cached summary after API failure", extra={"cache_key": cache_key})
                return cached_fallback
            fallback = self._fallback_summary(text)
            self.logger.error("Using fallback summary after OpenRouter failure")
            return fallback

    async def batch_summarize(self, articles: List[Dict[str, str]], length: SUPPORTED_LENGTHS) -> List[str]:
        """Summarize multiple articles concurrently."""

        tasks = [
            self.summarize(article.get("content", ""), article.get("title", ""), length, article_id=article.get("id"))
            for article in articles
        ]
        return await asyncio.gather(*tasks)

    def get_token_usage(self) -> Dict[str, Dict[str, int]]:
        """Return cumulative token usage captured by the tracker."""

        return self.cost_tracker.get_cumulative_usage()

    def reset_usage_tracking(self) -> None:
        """Reset token usage counters."""

        self.cost_tracker.reset()

    async def validate_api_key(self) -> bool:
        """Perform a lightweight request to validate the configured API key."""

        try:
            payload = self._build_request(self.PROMPT_TEMPLATES["SHORT"], "Connectivity test", "", 1, False)
            await self._send_request(payload, streaming=False)
            return True
        except OpenRouterAuthenticationError:
            return False
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("API key validation failed", extra={"error": str(exc)})
            return False

    def _cache_key(self, article_id: str, length: str) -> str:
        return f"summary:{article_id}:{length}"

    def _generate_digest(self, title: str, text: str) -> str:
        digest_source = f"{title}-{text}".encode("utf-8")
        return sha256(digest_source).hexdigest()

    async def _get_cached_summary(self, cache_key: str) -> str | None:
        if not self.redis_client:
            return None
        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                return cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
            return None
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Failed to read from cache", extra={"error": str(exc)})
            return None

    async def _set_cached_summary(self, cache_key: str, summary: str) -> None:
        if not self.redis_client:
            return
        try:
            await self.redis_client.set(cache_key, summary, ex=CACHE_TTL_SECONDS)
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Failed to write summary to cache", extra={"error": str(exc)})

    async def _enforce_rate_limit(self) -> None:
        now = time.monotonic()
        window_start = now - 60
        while self._request_timestamps and self._request_timestamps[0] < window_start:
            self._request_timestamps.popleft()

        if len(self._request_timestamps) >= self.rate_limit_per_minute:
            retry_after = 60 - (now - self._request_timestamps[0])
            self.logger.warning("Local rate limit reached, delaying request", extra={"retry_after": retry_after})
            await asyncio.sleep(retry_after)

        self._request_timestamps.append(time.monotonic())

    def _adjust_length_for_budget(self, length: str, prompt_tokens: int, max_tokens: int) -> tuple[str, int]:
        token_budget = 7000  # heuristic safeguard against context limits
        if prompt_tokens + max_tokens <= token_budget:
            return length, max_tokens

        if length == "LONG":
            self.logger.info("Adjusting summary length to MEDIUM due to token budget")
            return "MEDIUM", self.MAX_TOKENS_BY_LENGTH["MEDIUM"]
        if length == "MEDIUM":
            self.logger.info("Adjusting summary length to SHORT due to token budget")
            return "SHORT", self.MAX_TOKENS_BY_LENGTH["SHORT"]
        return length, max_tokens

    def _build_request(self, prompt: str, title: str, text: str, max_tokens: int, streaming: bool) -> OpenRouterRequest:
        messages = [
            OpenRouterMessage(role="system", content="You are a news summarizer. Create concise, factual summaries."),
            OpenRouterMessage(role="user", content=f"{prompt}\n\nTitle: {title}\n\nArticle: {text}"),
        ]
        return OpenRouterRequest(messages=messages, max_tokens=max_tokens, stream=streaming)

    async def _send_request(self, payload: OpenRouterRequest, *, streaming: bool) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        request_json = payload.model_dump(exclude_none=True)
        try:
            if streaming:
                return await self._stream_response(headers, request_json)

            response = await self.http_client.post(OPENROUTER_API_URL, json=request_json, headers=headers)
            response.raise_for_status()
            return response.text
        except httpx.HTTPStatusError as exc:  # pragma: no cover - specific branch validated in tests
            status = exc.response.status_code
            if status == 401:
                raise OpenRouterAuthenticationError("Invalid OpenRouter API key") from exc
            if status == 429:
                raise OpenRouterRateLimitError("OpenRouter rate limit exceeded") from exc
            if status == 503:
                raise OpenRouterServiceError("OpenRouter service unavailable") from exc
            raise OpenRouterServiceError(f"HTTP error from OpenRouter: {status}") from exc
        except httpx.TimeoutException as exc:
            raise OpenRouterServiceError("OpenRouter request timed out") from exc
        except httpx.RequestError as exc:
            raise OpenRouterServiceError(f"Network error while calling OpenRouter: {exc}") from exc

    async def _stream_response(self, headers: Dict[str, str], request_json: Dict[str, Any]) -> str:
        chunks: List[str] = []
        async with self.http_client.stream("POST", OPENROUTER_API_URL, json=request_json, headers=headers) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or line == "data: [DONE]":
                    continue
                content_line = line.replace("data: ", "")
                try:
                    parsed = json.loads(content_line)
                    delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        chunks.append(delta)
                except json.JSONDecodeError:
                    continue
        return "".join(chunks)

    def _handle_response(self, response_text: str, *, default_model: str) -> SummaryResult:
        try:
            parsed = OpenRouterResponse.model_validate_json(response_text)
        except Exception as exc:  # noqa: BLE001
            raise OpenRouterResponseError("Failed to parse OpenRouter response") from exc

        if not parsed.choices or not parsed.choices[0].message:
            raise OpenRouterResponseError("Malformed OpenRouter response: missing summary")

        usage = parsed.usage or None
        prompt_tokens = usage.prompt_tokens if usage else estimate_tokens(response_text)
        completion_tokens = usage.completion_tokens if usage else 0
        model = default_model

        self.cost_tracker.add_usage(model, prompt_tokens, completion_tokens)
        return SummaryResult(
            summary=parsed.choices[0].message.content,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cached=False,
            timestamp=time.time(),
        )

    def _fallback_summary(self, text: str) -> str:
        sentences = [sentence.strip() for sentence in text.split(".") if sentence.strip()]
        fallback_sentences = sentences[:3]
        return ". ".join(fallback_sentences) + ("." if fallback_sentences else "")
