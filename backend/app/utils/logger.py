"""Centralized logging configuration for the application."""
from __future__ import annotations

import logging
from contextvars import ContextVar
from logging.config import dictConfig

from app.config import settings

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestIdFilter(logging.Filter):
    """Inject the current request ID from context vars into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003 - matches logging API
        record.request_id = request_id_ctx.get() or "-"
        record.environment = settings.environment
        return True


def configure_logging() -> None:
    """Configure structured logging for the service."""

    base_format = "%(asctime)s %(levelname)s [%(name)s] [env=%(environment)s] [request_id=%(request_id)s] %(message)s"
    if settings.log_format == "json":
        base_format = (
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", '
            '"environment": "%(environment)s", "request_id": "%(request_id)s", "message": "%(message)s"}'
        )

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": base_format,
                }
            },
            "filters": {"request_id": {"()": RequestIdFilter}},
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "filters": ["request_id"],
                }
            },
            "root": {"handlers": ["default"], "level": settings.log_level},
        }
    )


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger instance."""

    return logging.getLogger(name)
