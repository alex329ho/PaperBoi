"""Default schedule configuration for PaperBoi background jobs."""
from __future__ import annotations

from datetime import time
from typing import Any, Dict

from pytz import UTC

DEFAULT_TIMEZONE = UTC
DEFAULT_TIMEOUT_SECONDS = 300


JOB_SCHEDULES: Dict[str, Dict[str, Any]] = {
    "fetch_daily_news": {
        "trigger": "interval",
        "hours": 8,
        "id": "fetch-daily-news",
        "max_instances": 1,
        "misfire_grace_time": 120,
    },
    "generate_daily_summaries": {
        "trigger": "cron",
        "minute": 5,
        "id": "generate-daily-summaries",
        "max_instances": 1,
        "misfire_grace_time": 120,
    },
    "send_daily_emails": {
        "trigger": "cron",
        "minute": 15,
        "id": "send-daily-emails",
        "max_instances": 1,
        "misfire_grace_time": 120,
    },
    "update_trending_topics": {
        "trigger": "interval",
        "hours": 6,
        "id": "update-trending-topics",
        "max_instances": 1,
        "misfire_grace_time": 60,
    },
    "cleanup_expired_data": {
        "trigger": "cron",
        "hour": 2,
        "minute": 0,
        "id": "cleanup-expired-data",
        "max_instances": 1,
        "misfire_grace_time": 300,
    },
    "check_api_health": {
        "trigger": "interval",
        "minutes": 5,
        "id": "check-api-health",
        "max_instances": 1,
        "misfire_grace_time": 60,
    },
    "retry_failed_emails": {
        "trigger": "interval",
        "minutes": 30,
        "id": "retry-failed-emails",
        "max_instances": 1,
        "misfire_grace_time": 120,
    },
}


USER_NOTIFICATION_FALLBACK = time(hour=8, minute=0, tzinfo=UTC)
