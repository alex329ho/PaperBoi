"""Email validation and normalization helpers."""
from __future__ import annotations

from email_validator import EmailNotValidError, validate_email


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

    try:
        return validate_email(address, check_deliverability=False).email
    except EmailNotValidError as exc:  # pragma: no cover - exercised via InvalidEmailError
        raise InvalidEmailError(str(exc)) from exc


def validate_email_addresses(addresses: list[str]) -> list[str]:
    """Validate a list of email addresses, returning normalized versions."""

    return [validate_email_address(address) for address in addresses]
