"""High-level summarization orchestration for PaperBoi."""
from __future__ import annotations

from typing import Any, Dict, List

from redis.asyncio import Redis

from backend.services.openrouter_service import OpenRouterService
from backend.utils.cost_tracker import CostTracker


class SummarizationService:
    """Coordinate summarization workloads across articles."""

    def __init__(self, redis_client: Redis, *, cost_tracker: CostTracker | None = None) -> None:
        self.cost_tracker = cost_tracker or CostTracker()
        self.client = OpenRouterService(redis_client, cost_tracker=self.cost_tracker)

    async def summarize_article(self, article: Dict[str, Any], *, length: str = "MEDIUM") -> str:
        """Summarize a single article dictionary."""

        content = article.get("content", "") or ""
        title = article.get("title", "") or ""
        if not self.client.api_key:
            return self._fallback_summary(content, title)

        return await self.client.summarize(
            content,
            title,
            length,
            article_id=str(article.get("id")),
        )

    async def generate_report(self, article: Dict[str, Any], *, length: str = "LONG") -> Dict[str, Any]:
        """Generate a structured report for a single article."""

        content = article.get("content", "") or ""
        title = article.get("title", "") or ""
        article_id = str(article.get("id") or "")
        if not self.client.api_key:
            return self._fallback_report(content, title)

        try:
            report = await self.client.generate_report(article, length=length, article_id=article_id)
            return self._normalize_report(report, content, title)
        except Exception:  # noqa: BLE001
            return self._fallback_report(content, title)

    async def summarize_articles(self, articles: List[Dict[str, Any]], *, length: str = "MEDIUM") -> List[str]:
        """Summarize multiple articles while reusing the shared OpenRouter client."""

        return await self.client.batch_summarize(articles, length)

    def get_usage(self) -> Dict[str, Dict[str, int]]:
        """Expose aggregated token usage metrics."""

        return self.client.get_token_usage()

    def reset_usage(self) -> None:
        """Reset tracked cost and token metrics."""

        self.client.reset_usage_tracking()

    @staticmethod
    def _fallback_summary(text: str, title: str) -> str:
        sanitized = " ".join((text or "").split())
        sentences = [sentence.strip() for sentence in sanitized.split(".") if sentence.strip()]
        if sentences:
            return ". ".join(sentences[:3]) + "."
        return title or "Summary unavailable."

    def _fallback_report(self, text: str, title: str) -> Dict[str, Any]:
        summary = self._ensure_min_words(self._fallback_summary(text, title), text, title, minimum=250)
        keywords = self._top_keywords(text)
        series = [{"label": label, "value": value} for label, value in keywords]
        quotes = self._extract_quotes(text, count=3)
        insights = [
            f"Insight {idx + 1}: {quote}"
            for idx, quote in enumerate(quotes)
        ]
        implications = [
            "Near-term decisions should align with the strongest themes in the article while avoiding overcommitment.",
            "Operational plans may need short-cycle reviews as conditions evolve.",
            "Stakeholders should track follow-up reporting for confirmation.",
        ]
        outlook = [
            "Momentum likely depends on continued execution and measurable outcomes in the next few quarters.",
            "If the highlighted initiatives scale, expectations could stabilize rather than spike.",
            "External pressures may shift the trajectory if conditions change.",
        ]
        risks = [
            "Limited source data could reduce confidence in the trend described.",
            "Operational complexity may slow implementation timelines.",
            "Market sentiment could reverse if results disappoint.",
        ]
        action_items = [
            "Monitor new developments from the primary source and related industry updates.",
            "Assess internal exposure to the top themes referenced.",
            "Prepare contingency plans if the risks materialize.",
        ]
        return {
            "summary": summary,
            "key_insights": insights,
            "implications": implications,
            "outlook": outlook,
            "risks": risks,
            "action_items": action_items,
            "data_graph": {
                "title": "Top keywords",
                "type": "bar",
                "series": series,
            },
        }

    @staticmethod
    def _top_keywords(text: str) -> list[tuple[str, int]]:
        stopwords = {
            # Determiners
            "a", "an", "the", "this", "that", "these", "those", "my", "your", "our", "their",
            "his", "her", "its", "some", "any", "each", "every", "either", "neither",
            # Conjunctions
            "and", "but", "or", "nor", "so", "yet", "for",
            # Prepositions
            "in", "on", "at", "by", "to", "of", "from", "with", "about", "over", "under", "into",
            "through", "between", "among", "after", "before", "during", "within", "without",
            "near", "across", "around", "behind", "beneath", "beside", "beyond",
            # Common verbs/auxiliaries/pronouns
            "are", "was", "were", "is", "be", "been", "has", "have", "had", "will", "would", "can",
            "could", "should", "may", "might", "do", "does", "did", "not", "you", "we", "they",
            "he", "she", "them", "then", "also", "said", "says",
        }
        tokens = [
            token.strip(".,!?\"'()[]{}:;").lower()
            for token in (text or "").split()
        ]
        counts: dict[str, int] = {}
        for token in tokens:
            if not token or token in stopwords or len(token) < 4:
                continue
            counts[token] = counts.get(token, 0) + 1
        sorted_items = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
        return sorted_items[:6]

    def _normalize_report(self, report: Dict[str, Any], text: str, title: str) -> Dict[str, Any]:
        normalized: Dict[str, Any] = dict(report or {})
        summary = normalized.get("summary") or self._fallback_summary(text, title)
        normalized["summary"] = self._ensure_min_words(str(summary), text, title, minimum=250)

        quotes = self._extract_quotes(text, count=3)
        insights = [f"Insight {idx + 1}: {quote}" for idx, quote in enumerate(quotes[:3])]
        normalized["key_insights"] = [self._trim_words(item, 50) for item in insights]

        normalized["implications"] = self._normalize_points(
            normalized.get("implications"), fallback=[
                "Near-term decisions should align with the strongest themes in the article while avoiding overcommitment.",
                "Operational plans may need short-cycle reviews as conditions evolve.",
                "Stakeholders should track follow-up reporting for confirmation.",
            ],
        )
        normalized["outlook"] = self._normalize_points(
            normalized.get("outlook"), fallback=[
                "Momentum likely depends on continued execution and measurable outcomes in the next few quarters.",
                "If the highlighted initiatives scale, expectations could stabilize rather than spike.",
                "External pressures may shift the trajectory if conditions change.",
            ],
        )
        normalized["risks"] = self._normalize_points(
            normalized.get("risks"), fallback=[
                "Limited source data could reduce confidence in the trend described.",
                "Operational complexity may slow implementation timelines.",
                "Market sentiment could reverse if results disappoint.",
            ],
        )
        normalized["action_items"] = self._normalize_points(
            normalized.get("action_items"), fallback=[
                "Monitor new developments from the primary source and related industry updates.",
                "Assess internal exposure to the top themes referenced.",
                "Prepare contingency plans if the risks materialize.",
            ],
        )

        data_graph = normalized.get("data_graph") if isinstance(normalized.get("data_graph"), dict) else {}
        series = data_graph.get("series") if isinstance(data_graph.get("series"), list) else []
        if not series:
            keywords = self._top_keywords(text)
            series = [{"label": label, "value": value} for label, value in keywords]
        normalized["data_graph"] = {
            "title": data_graph.get("title") or "Top keywords",
            "type": data_graph.get("type") if data_graph.get("type") in {"bar", "line"} else "bar",
            "series": series,
        }
        return normalized

    @staticmethod
    def _normalize_points(value: Any, *, fallback: list[str]) -> list[str]:
        points = value if isinstance(value, list) else []
        points = [str(item).strip() for item in points if str(item).strip()]
        if not points:
            points = fallback
        return [SummarizationService._trim_words(item, 50) for item in points]

    @staticmethod
    def _trim_words(text: str, limit: int) -> str:
        tokens = text.split()
        if len(tokens) <= limit:
            return text
        return " ".join(tokens[:limit])

    @staticmethod
    def _ensure_min_words(summary: str, text: str, title: str, *, minimum: int) -> str:
        words = summary.split()
        if len(words) >= minimum:
            return summary
        expanded = summary.strip()
        extra = SummarizationService._fallback_summary(text, title)
        candidates = [extra, text]
        for chunk in candidates:
            if not chunk:
                continue
            expanded = f"{expanded} {chunk}".strip()
            if len(expanded.split()) >= minimum:
                break
        if len(expanded.split()) < minimum:
            filler = (
                f" This report synthesizes the article titled \"{title}\" to provide clarity on "
                "the main events, surrounding context, and likely next steps. It highlights the "
                "most repeated themes and frames potential implications for readers."
            )
            expanded = f"{expanded} {filler}".strip()
        return expanded

    @staticmethod
    def _extract_quotes(text: str, *, count: int) -> list[str]:
        sentences = [sentence.strip() for sentence in (text or "").split(".") if sentence.strip()]
        if not sentences:
            return ["\"No direct quote available.\""] * count
        quotes: list[str] = []
        for sentence in sentences:
            if len(quotes) >= count:
                break
            snippet = sentence
            if len(snippet.split()) > 45:
                snippet = " ".join(snippet.split()[:45])
            quotes.append(f"\"{snippet}.\"")
        while len(quotes) < count:
            quotes.append(quotes[-1])
        return quotes
