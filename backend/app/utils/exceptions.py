"""Custom exception hierarchy for PaperBoi."""
from __future__ import annotations

from fastapi import status


class PaperBoiException(Exception):
    """Base custom exception carrying an HTTP status code."""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST, error_code: str | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__


class AuthenticationException(PaperBoiException):
    """Raised when authentication fails."""

    def __init__(self, detail: str = "Authentication failed") -> None:
        super().__init__(detail, status.HTTP_401_UNAUTHORIZED)


class AuthorizationException(PaperBoiException):
    """Raised when the user is not authorized to perform an action."""

    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(detail, status.HTTP_403_FORBIDDEN)


class NotFoundException(PaperBoiException):
    """Raised when a requested resource is not found."""

    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail, status.HTTP_404_NOT_FOUND)


class RateLimitException(PaperBoiException):
    """Raised when a client exceeds allowed request thresholds."""

    def __init__(self, detail: str = "Rate limit exceeded") -> None:
        super().__init__(detail, status.HTTP_429_TOO_MANY_REQUESTS)


class ServiceUnavailableException(PaperBoiException):
    """Raised when a dependency is unavailable."""

    def __init__(self, detail: str = "Service unavailable") -> None:
        super().__init__(detail, status.HTTP_503_SERVICE_UNAVAILABLE)
