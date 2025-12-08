"""Cost and token usage tracking utilities for OpenRouter summarization."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Dict

from backend.utils.logger import get_logger


class CostTracker:
    """Track prompt and completion token usage per model.

    The tracker aggregates usage per UTC date to support daily reporting and
    proactive alerting when usage thresholds are approached.
    """

    def __init__(self, *, alert_threshold: int | None = None) -> None:
        self._usage: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._logger = get_logger(__name__)
        self.alert_threshold = alert_threshold

    def record_usage(self, model: str, prompt_tokens: int, completion_tokens: int) -> None:
        """Record token usage for a single request."""

        date_key = datetime.utcnow().date().isoformat()
        totals = self._usage[model]
        totals["prompt_tokens"] += prompt_tokens
        totals["completion_tokens"] += completion_tokens
        totals["total_tokens"] += prompt_tokens + completion_tokens
        totals["last_updated"] = date_key  # type: ignore[assignment]

        if self.alert_threshold and totals["total_tokens"] >= self.alert_threshold:
            self._logger.warning(
                "Approaching configured token threshold", extra={"model": model, "total_tokens": totals["total_tokens"]}
            )

    def get_token_usage(self) -> Dict[str, Dict[str, int]]:
        """Return aggregated token counts keyed by model name."""

        return {model: dict(stats) for model, stats in self._usage.items()}

    def reset_usage_tracking(self) -> None:
        """Clear all tracked usage data."""

        self._usage.clear()
