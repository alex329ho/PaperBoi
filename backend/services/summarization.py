"""High-level summarization orchestration for PaperBoi."""
from __future__ import annotations

from typing import Dict, List

from redis.asyncio import Redis

from config import AppSettings, get_settings
from services.openrouter_service import OpenRouterService
from utils.logger import get_logger


class SummarizationOrchestrator:
    """Coordinate summarization workflows across different providers."""

    def __init__(self, *, redis_client: Redis | None = None, settings: AppSettings | None = None) -> None:
        self.settings = settings or get_settings()
        self.logger = get_logger(self.__class__.__name__)
        self.service = OpenRouterService(redis_client=redis_client, settings=self.settings, logger=self.logger)

    async def summarize_article(self, title: str, content: str, length: str) -> str:
        """Summarize a single article using the OpenRouter service."""

        return await self.service.summarize(content, title, length)

    async def summarize_batch(self, articles: List[Dict[str, str]], length: str) -> List[str]:
        """Summarize a batch of articles concurrently."""

        return await self.service.batch_summarize(articles, length)

    def token_usage(self):
        """Expose token usage metrics for monitoring."""

        return self.service.get_token_usage()

    def reset_usage(self) -> None:
        """Reset tracked token usage counters."""

        self.service.reset_usage_tracking()
