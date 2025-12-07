"""Pydantic models for GDELT API responses.

Example GDELT API response::

    {
      "articles": [
        {
          "url": "https://...",
          "url_mobile": "...",
          "title": "Article Title",
          "domain": "example.com",
          "seendate": "YYYYMMDDHHMMSS",
          "socialimage": "...",
          "sourcecountry": "US",
          "sourcename": "CNN",
          "language": "en",
          "tone": -8.5
        }
      ],
      "sourceCommon": {
        "url": "https://...",
        "summaryUrl": "..."
      }
    }
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import AnyHttpUrl, BaseModel, Field, HttpUrl, field_validator


class SourceCommon(BaseModel):
    """Metadata about the source returned by GDELT."""

    url: Optional[AnyHttpUrl] = Field(default=None, description="Canonical source URL")
    summaryUrl: Optional[AnyHttpUrl] = Field(default=None, description="Summary page URL")


class GdeltArticle(BaseModel):
    """Representation of an article entry from the GDELT API."""

    url: HttpUrl
    url_mobile: Optional[AnyHttpUrl] = None
    title: str
    domain: Optional[str] = None
    seendate: str
    socialimage: Optional[AnyHttpUrl] = None
    sourcecountry: Optional[str] = Field(default=None, min_length=2, max_length=2)
    sourcename: Optional[str] = None
    language: Optional[str] = Field(default=None, min_length=2, max_length=5)
    tone: Optional[float] = None

    @field_validator("seendate")
    @classmethod
    def validate_seendate(cls, value: str) -> str:
        """Ensure the seendate value follows the expected timestamp format."""

        datetime.strptime(value, "%Y%m%d%H%M%S")
        return value

    @property
    def seen_datetime(self) -> datetime:
        """Return ``seendate`` as a timezone-naive datetime instance."""

        return datetime.strptime(self.seendate, "%Y%m%d%H%M%S")


class GdeltResponse(BaseModel):
    """Top-level response wrapper for GDELT API queries."""

    articles: list[GdeltArticle] = Field(default_factory=list)
    sourceCommon: Optional[SourceCommon] = None
