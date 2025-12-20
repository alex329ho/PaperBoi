"""Email validation and normalization helpers."""
from __future__ import annotations

def _import_email_validator():
    """Import ``email_validator`` lazily so the app can start without it.

    FastAPI will load all modules at startup, so a missing optional dependency
    should not prevent the application from booting. We defer the import to the
    point of use and raise a clear error that tells operators how to install it.
    """

    try:
        from email_validator import EmailNotValidError, validate_email
    except ModuleNotFoundError as exc:  # pragma: no cover - defensive import guard
        raise RuntimeError(
            "email-validator is required but not installed. Install dependencies via `pip install -r backend/requirements.txt`."
        ) from exc

    return EmailNotValidError, validate_email


class InvalidEmailError(ValueError):
    """Raised when an email address fails validation."""


def validate_email_address(address: str) -> str:
    """Validate and normalize an email address.

    Parameters
    ----------
    address:
        Raw email address provided by a user or system.

    Returns
    -------
    str
        Normalized email address in RFC compliant format.

    Raises
    ------
    InvalidEmailError
        If the address is syntactically invalid.
    """

    EmailNotValidError, validate_email = _import_email_validator()

    try:
        return validate_email(address, check_deliverability=False).normalized
    except EmailNotValidError as exc:  # pragma: no cover - exercised via InvalidEmailError
        raise InvalidEmailError(str(exc)) from exc


def validate_email_addresses(addresses: list[str]) -> list[str]:
    """Validate a list of email addresses, returning normalized versions."""

    return [validate_email_address(address) for address in addresses]
