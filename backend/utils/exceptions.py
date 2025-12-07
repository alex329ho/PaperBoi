"""Custom exception hierarchy for the application."""
from __future__ import annotations

from fastapi import status


class ApplicationError(Exception):
    """Base application error for consistent HTTP responses."""

    def __init__(self, message: str, *, status_code: int = status.HTTP_400_BAD_REQUEST, code: str = "application_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class NotFoundError(ApplicationError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND, code="not_found")


class UnauthorizedError(ApplicationError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED, code="unauthorized")


class ConflictError(ApplicationError):
    """Raised when an operation conflicts with existing state."""

    def __init__(self, message: str = "Conflict") -> None:
        super().__init__(message, status_code=status.HTTP_409_CONFLICT, code="conflict")
