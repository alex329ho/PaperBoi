"""Notification helpers for scheduler events."""
from __future__ import annotations

import logging
from typing import Any

from backend.utils.logger import get_logger

logger = get_logger(__name__)


def send_job_alert(message: str, *, level: int = logging.ERROR, extra: dict[str, Any] | None = None) -> None:
    """Emit an alert for scheduler/job failures.

    In production this can be extended to integrate with PagerDuty, Slack, or
    email alerts. For now it centralizes logging with structured context.
    """

    payload = extra or {}
    logger.log(level, message, extra=payload)
