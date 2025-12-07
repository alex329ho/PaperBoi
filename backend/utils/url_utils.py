"""URL validation and hashing helpers."""
from __future__ import annotations

import hashlib
from urllib.parse import urlparse


def is_valid_url(url: str) -> bool:
    """Return True if the given string looks like a valid HTTP or HTTPS URL."""

    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def hash_url(url: str) -> str:
    """Return an MD5 hash for the provided URL for deduplication."""

    return hashlib.md5(url.strip().encode("utf-8"), usedforsecurity=False).hexdigest()
