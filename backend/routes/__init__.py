"""Route registrations for PaperBoi API."""
from .news import router as news_router
from .preferences import router as preferences_router
from .auth import router as auth_router
from .email import router as email_router
from .health import router as health_router

__all__ = [
    "news_router",
    "preferences_router",
    "auth_router",
    "email_router",
    "health_router",
]
