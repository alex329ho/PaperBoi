"""ORM models package."""
from app.models.database import Base
from app.models.email_log import EmailLog
from app.models.news import NewsArticle, Summary
from app.models.user import User, UserPreferences

__all__ = [
    "Base",
    "EmailLog",
    "NewsArticle",
    "Summary",
    "User",
    "UserPreferences",
]
