"""Centralized logging configuration."""
from __future__ import annotations

import json
import logging
from logging.config import dictConfig
from typing import Any, Dict

from app.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""

    class RequestIdFilter(logging.Filter):
        """Inject request_id into log records to simplify tracing."""

        def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
            if not hasattr(record, "request_id"):
                record.request_id = "-"
            return True

    formatter: Dict[str, Any] = {
        "format": settings.log_format,
    }
    if settings.json_logs:
        formatter = {"()": JSONFormatter}

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"request_id": {"()": RequestIdFilter}},
        "formatters": {
            "default": formatter,
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.log_level,
                "formatter": "default",
                "filters": ["request_id"],
            }
        },
        "loggers": {
            "": {"handlers": ["console"], "level": settings.log_level},
            "uvicorn.error": {"handlers": ["console"], "level": settings.log_level, "propagate": False},
            "uvicorn.access": {"handlers": ["console"], "level": settings.log_level, "propagate": False},
        },
    }

    dictConfig(logging_config)


class JSONFormatter(logging.Formatter):
    """Lightweight JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        base = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            base["exception"] = self.formatException(record.exc_info)
        return json.dumps(base)
