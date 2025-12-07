"""Custom exceptions for GDELT integration operations."""
from __future__ import annotations

from typing import Any


class GDELTError(Exception):
    """Base error for all GDELT service failures."""

    def __init__(self, message: str, *, details: Any | None = None) -> None:
        super().__init__(message)
        self.details = details


class GDELTRateLimitError(GDELTError):
    """Raised when the GDELT API rate limit is reached or exceeded."""


class GDELTInvalidParameterError(GDELTError):
    """Raised when query parameters fail validation."""


class GDELTResponseError(GDELTError):
    """Raised when the GDELT API returns an unexpected response."""


class GDELTNetworkError(GDELTError):
    """Raised when HTTP communication with GDELT fails."""


class GDELTDatabaseError(GDELTError):
    """Raised when persistence of fetched data fails."""


class GDELTContentFetchError(GDELTError):
    """Raised when article content retrieval fails."""
