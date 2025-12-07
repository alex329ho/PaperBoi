"""Schemas for news articles and summaries."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import ORMBaseModel


class NewsArticleBase(BaseModel):
    """Common news article fields."""

    title: str = Field(max_length=500)
    url: str = Field(max_length=1024)
    domain: str | None = Field(default=None, max_length=255)
    source: str | None = Field(default=None, max_length=255)
    published_date: datetime | None = None
    content: str | None = None
    tone: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=255)
    language: str | None = Field(default=None, max_length=50)


class NewsArticleCreate(NewsArticleBase):
    """Payload for creating a news article."""


class SummaryBase(BaseModel):
    """Common summary fields."""

    summary_text: str
    length: int | None = None
    model_used: str | None = Field(default=None, max_length=255)


class SummaryCreate(SummaryBase):
    """Payload for creating a summary."""

    article_id: UUID


class SummaryResponse(SummaryBase, ORMBaseModel):
    """Response schema for summaries."""

    id: UUID
    article_id: UUID
    created_at: datetime


class NewsArticleResponse(NewsArticleBase, ORMBaseModel):
    """Response schema for news articles."""

    id: UUID
    created_at: datetime
    summaries: list[SummaryResponse] = Field(default_factory=list)
