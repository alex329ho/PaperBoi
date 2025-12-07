"""Custom exceptions for centralized error handling."""
from __future__ import annotations

from fastapi import HTTPException, status


class ApplicationError(HTTPException):
    """Base application error that carries an HTTP status code."""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.detail = detail
        self.status_code = status_code


class NotFoundError(ApplicationError):
    """Raised when a requested resource cannot be located."""

    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedError(ApplicationError):
    """Raised when authentication fails."""

    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class RateLimitExceededError(ApplicationError):
    """Raised when a client exceeds the allowed request rate."""

    def __init__(self, detail: str = "Rate limit exceeded") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


class DatabaseConnectionError(ApplicationError):
    """Raised when the application cannot communicate with the database."""

    def __init__(self, detail: str = "Database connection failed") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
