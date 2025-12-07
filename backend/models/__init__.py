"""ORM models package for PaperBoi."""
from __future__ import annotations

from .database import Base
from .email_log import EmailLog
from .news import NewsArticle, Summary
from .user import User, UserPreferences

__all__ = [
    "Base",
    "EmailLog",
    "NewsArticle",
    "Summary",
    "User",
    "UserPreferences",
]
