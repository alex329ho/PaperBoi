"""Schemas for news articles and summaries."""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import Field

from .base import BaseSchema


class NewsArticleBase(BaseSchema):
    """Shared fields for news article schemas."""

    title: str
    url: str
    domain: Optional[str] = None
    source: Optional[str] = None
    published_date: Optional[date] = None
    content: Optional[str] = None
    tone: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None


class NewsArticleCreate(NewsArticleBase):
    """Payload used when ingesting an article."""

    pass


class NewsArticleRead(NewsArticleBase):
    """Article data returned to clients."""

    id: int
    created_at: datetime


class SummaryBase(BaseSchema):
    """Shared fields for summaries."""

    article_id: int
    summary_text: str = Field(..., description="Generated summary body")
    length: int = Field(default=0, ge=0)
    model_used: Optional[str] = None


class SummaryCreate(SummaryBase):
    """Payload used to persist a generated summary."""

    pass


class SummaryRead(SummaryBase):
    """Summary representation for API responses."""

    id: int
    created_at: datetime
