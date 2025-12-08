"""Pydantic schemas for email operations."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl


class EmailStatus(str, Enum):
    """Lifecycle states for outbound emails."""

    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    SCHEDULED = "scheduled"


class EmailRecipient(BaseModel):
    """Recipient details for outbound email."""

    email: str
    name: Optional[str] = None


class EmailDeliveryRecord(BaseModel):
    """Status tracking for an outbound email."""

    email_id: str
    recipients: List[str]
    status: EmailStatus
    subject: str
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DailySummaryItem(BaseModel):
    """Represents a single article summary."""

    title: str
    summary: str
    url: HttpUrl
    source: str | None = None
    published_at: Optional[datetime] = None


class SingleArticlePayload(BaseModel):
    """Schema for single article notifications."""

    title: str
    summary: str
    url: HttpUrl
    source: str | None = None
    related: List[Dict[str, str]] | None = None


class BatchEmailResponse(BaseModel):
    """Response details after batch sending."""

    email_id: str
    sent: List[str]
    failed: Dict[str, str]
