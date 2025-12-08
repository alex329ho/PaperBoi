"""Centralized logging configuration."""
from __future__ import annotations

import logging
from contextvars import ContextVar
from typing import Optional

from backend.config import AppSettings

# Context variable used to inject request identifiers into log records
_request_id_ctx_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def set_request_id(request_id: Optional[str]) -> None:
    """Bind a request identifier to the current context for logging."""

    _request_id_ctx_var.set(request_id)


def get_request_id() -> Optional[str]:
    """Return the request identifier for the current context if set."""

    return _request_id_ctx_var.get()


class RequestIdFilter(logging.Filter):
    """Logging filter that appends the request id to log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        record.request_id = get_request_id() or "-"
        return True


def configure_logging(settings: AppSettings) -> None:
    """Configure the root logger according to application settings."""

    logging_level = getattr(logging, settings.logging_level.upper(), logging.INFO)
    logging.basicConfig(level=logging_level, format=settings.logging_format)

    # Attach request id filter to every handler for consistent correlation IDs
    for handler in logging.getLogger().handlers:
        handler.addFilter(RequestIdFilter())


def get_logger(name: str) -> logging.Logger:
    """Return a logger with request id awareness."""

    logger = logging.getLogger(name)
    if not any(isinstance(f, RequestIdFilter) for f in logger.filters):
        logger.addFilter(RequestIdFilter())
    return logger
