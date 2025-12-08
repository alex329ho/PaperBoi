"""Cost tracking utilities for OpenRouter API usage."""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict

from utils.logger import get_logger


class CostTracker:
    """Track and report token usage for billing and alerting."""

    def __init__(self, *, alert_threshold: int | None = None, logger: logging.Logger | None = None) -> None:
        self._usage: Dict[str, Dict[str, int]] = defaultdict(lambda: {"prompt_tokens": 0, "completion_tokens": 0})
        self._daily_usage: Dict[str, int] = defaultdict(int)
        self._last_reset = datetime.utcnow()
        self.alert_threshold = alert_threshold
        self.logger = logger or get_logger(self.__class__.__name__)

    def add_usage(self, model: str, prompt_tokens: int, completion_tokens: int) -> None:
        """Record token consumption for a single request."""

        entry = self._usage[model]
        entry["prompt_tokens"] += prompt_tokens
        entry["completion_tokens"] += completion_tokens
        self._daily_usage[model] += prompt_tokens + completion_tokens
        self._maybe_log_daily_usage()
        self._maybe_alert(model)

    def get_cumulative_usage(self) -> Dict[str, Dict[str, int]]:
        """Return cumulative token usage per model."""

        return {model: usage.copy() for model, usage in self._usage.items()}

    def reset(self) -> None:
        """Reset all usage counters."""

        self._usage.clear()
        self._daily_usage.clear()
        self._last_reset = datetime.utcnow()
        self.logger.info("Cost tracker usage counters reset")

    def _maybe_log_daily_usage(self) -> None:
        now = datetime.utcnow()
        if now - self._last_reset >= timedelta(days=1):
            self.logger.info("Daily token usage", extra={"usage": dict(self._daily_usage)})
            self._daily_usage.clear()
            self._last_reset = now

    def _maybe_alert(self, model: str) -> None:
        if self.alert_threshold is None:
            return

        total = self._usage[model]["prompt_tokens"] + self._usage[model]["completion_tokens"]
        if total >= self.alert_threshold:
            self.logger.warning(
                "Approaching token usage limit", extra={"model": model, "tokens_used": total, "threshold": self.alert_threshold}
            )
