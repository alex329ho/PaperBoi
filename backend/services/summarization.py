"""High-level summarization orchestration for PaperBoi."""
from __future__ import annotations

from typing import Any, Dict, List

from redis.asyncio import Redis

from services.openrouter_service import OpenRouterService
from utils.cost_tracker import CostTracker


class SummarizationService:
    """Coordinate summarization workloads across articles."""

    def __init__(self, redis_client: Redis, *, cost_tracker: CostTracker | None = None) -> None:
        self.cost_tracker = cost_tracker or CostTracker()
        self.client = OpenRouterService(redis_client, cost_tracker=self.cost_tracker)

    async def summarize_article(self, article: Dict[str, Any], *, length: str = "MEDIUM") -> str:
        """Summarize a single article dictionary."""

        return await self.client.summarize(
            article.get("content", ""),
            article.get("title", ""),
            length,
            article_id=str(article.get("id")),
        )

    async def summarize_articles(self, articles: List[Dict[str, Any]], *, length: str = "MEDIUM") -> List[str]:
        """Summarize multiple articles while reusing the shared OpenRouter client."""

        return await self.client.batch_summarize(articles, length)

    def get_usage(self) -> Dict[str, Dict[str, int]]:
        """Expose aggregated token usage metrics."""

        return self.client.get_token_usage()

    def reset_usage(self) -> None:
        """Reset tracked cost and token metrics."""

        self.client.reset_usage_tracking()
