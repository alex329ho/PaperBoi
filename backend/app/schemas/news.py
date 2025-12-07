"""Schemas for news and summaries."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.base import ORMBase, TimestampedSchema


class NewsArticleBase(BaseModel):
    """Shared fields for news articles."""

    title: str = Field(..., max_length=512)
    url: HttpUrl
    domain: Optional[str] = Field(default=None, max_length=255)
    source: Optional[str] = Field(default=None, max_length=255)
    published_date: Optional[datetime] = None
    content: Optional[str] = None
    tone: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=255)
    language: Optional[str] = Field(default=None, max_length=10)


class NewsArticleCreate(NewsArticleBase):
    """Request payload for new articles."""

    pass


class SummaryBase(BaseModel):
    """Shared summary fields."""

    summary_text: str
    length: Optional[int] = None
    model_used: Optional[str] = None


class SummaryResponse(SummaryBase, TimestampedSchema, ORMBase):
    """API response for a summary."""

    id: int


class NewsArticleResponse(NewsArticleBase, TimestampedSchema, ORMBase):
    """API response for an article with its summary."""

    id: uuid.UUID
    summary: Optional[SummaryResponse] = None
