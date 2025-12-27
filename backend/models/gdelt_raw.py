"""Raw GDELT ingestion model."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class GdeltRawArticle(Base):
    """Stores raw GDELT payloads for replay/debugging."""

    __tablename__ = "gdelt_raw_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    url: Mapped[str] = mapped_column(Text(), nullable=False)
    url_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True, unique=True)
    seendate: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sourcecountry: Mapped[Optional[str]] = mapped_column(String(10))
    language: Mapped[Optional[str]] = mapped_column(String(10))
    raw: Mapped[dict] = mapped_column(JSON, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
