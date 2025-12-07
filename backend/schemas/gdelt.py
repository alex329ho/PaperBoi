"""Pydantic models for GDELT API responses."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import AnyHttpUrl, BaseModel, Field, HttpUrl, field_validator


class SourceCommon(BaseModel):
    url: Optional[AnyHttpUrl] = Field(default=None, description="Canonical source URL")
    summaryUrl: Optional[AnyHttpUrl] = Field(default=None, description="Summary page URL")


class GdeltArticle(BaseModel):
    url: HttpUrl
    url_mobile: Optional[AnyHttpUrl] = None
    title: Optional[str] = None
    domain: Optional[str] = None
    seendate: Optional[str] = None
    socialimage: Optional[AnyHttpUrl] = None
    # relaxed: accept full names too; service will decide how to use it
    sourcecountry: Optional[str] = Field(default=None, description="Source country or full name")
    sourcename: Optional[str] = None
    language: Optional[str] = Field(default=None, description="Language or full name")
    tone: Optional[float] = None

    @field_validator("url_mobile", "socialimage", mode="before")
    @classmethod
    def empty_string_to_none(cls, value):
        """Treat empty strings as None so empty URL fields don't fail validation."""
        if value == "" or value is None:
            return None
        return value

    @field_validator("seendate")
    @classmethod
    def validate_seendate(cls, value: Optional[str]) -> Optional[str]:
        """Accept multiple timestamp formats used by GDELT and normalize if possible."""
        if value is None or value == "":
            return None

        # GDELT historically used '%Y%m%d%H%M%S', but some responses include
        # ISO-like 'YYYYMMDDTHHMMSSZ' / 'YYYY-MM-DDTHH:MM:SSZ' variants.
        candidates = (value,)

        # Try known formats; if parsing succeeds, return the original string.
        for fmt in ("%Y%m%d%H%M%S", "%Y%m%dT%H%M%SZ", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                datetime.strptime(value, fmt)
                return value
            except Exception:
                continue

        # If nothing matched, leave the value (caller must handle missing/unknown format).
        return value

    @property
    def seen_datetime(self) -> Optional[datetime]:
        """Return a datetime parsed from `seendate` when possible."""
        if not self.seendate:
            return None

        for fmt in ("%Y%m%d%H%M%S", "%Y%m%dT%H%M%SZ", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                return datetime.strptime(self.seendate, fmt)
            except Exception:
                continue
        return None


class GdeltResponse(BaseModel):
    articles: list[GdeltArticle] = Field(default_factory=list)
    sourceCommon: Optional[SourceCommon] = None