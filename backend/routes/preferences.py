"""User preference endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_current_user, get_db_session
from middleware.rate_limit import RateLimiter
from models.user import User, UserPreferences
from utils.logger import get_logger

router = APIRouter(prefix="/preferences", tags=["preferences"])
logger = get_logger(__name__)
rate_limiter = RateLimiter()


def envelope(data: Any, message: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": True, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    if message:
        payload["message"] = message
    return payload


class PreferencesPayload(BaseModel):
    topics: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    notification_enabled: bool = True
    notification_time: str = Field(default="08:00")
    summary_length: str = Field(default="MEDIUM")
    email_frequency: str = Field(default="daily")


@router.get("", dependencies=[Depends(rate_limiter.dependency("preferences:get"))])
async def get_preferences(
    user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db_session)
) -> Dict[str, Any]:
    """Return the authenticated user's preferences."""

    if user.preferences is None:
        prefs = UserPreferences(user_id=user.id)
        session.add(prefs)
        await session.commit()
        await session.refresh(prefs)
    else:
        prefs = user.preferences
    return envelope(
        {
            "topics": prefs.topics,
            "regions": prefs.regions,
            "languages": prefs.languages,
            "notification_enabled": prefs.notification_enabled,
            "notification_time": prefs.notification_time,
            "summary_length": "MEDIUM",
            "email_frequency": "daily",
        }
    )


@router.put("", dependencies=[Depends(rate_limiter.dependency("preferences:update"))])
async def update_preferences(
    payload: PreferencesPayload,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Update preference values for the authenticated user."""

    if user.preferences is None:
        prefs = UserPreferences(user_id=user.id)
        session.add(prefs)
    else:
        prefs = user.preferences

    prefs.topics = payload.topics
    prefs.regions = payload.regions
    prefs.languages = payload.languages
    prefs.notification_enabled = payload.notification_enabled
    prefs.notification_time = payload.notification_time

    await session.commit()
    await session.refresh(prefs)
    return envelope(
        {
            "topics": prefs.topics,
            "regions": prefs.regions,
            "languages": prefs.languages,
            "notification_enabled": prefs.notification_enabled,
            "notification_time": prefs.notification_time,
            "summary_length": payload.summary_length,
            "email_frequency": payload.email_frequency,
        },
        message="Preferences updated successfully",
    )


@router.post("/topics", dependencies=[Depends(rate_limiter.dependency("preferences:topics"))])
async def update_topics(
    payload: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Add or remove topics for the user."""

    topics = payload.get("topics")
    if not isinstance(topics, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="topics must be a list")
    if user.preferences is None:
        user.preferences = UserPreferences(user_id=user.id)
    user.preferences.topics = topics
    session.add(user.preferences)
    await session.commit()
    await session.refresh(user.preferences)
    return envelope({"topics": user.preferences.topics})


@router.post("/regions", dependencies=[Depends(rate_limiter.dependency("preferences:regions"))])
async def update_regions(
    payload: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Add or remove regions for the user."""

    regions = payload.get("regions")
    if not isinstance(regions, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="regions must be a list")
    if user.preferences is None:
        user.preferences = UserPreferences(user_id=user.id)
    user.preferences.regions = regions
    session.add(user.preferences)
    await session.commit()
    await session.refresh(user.preferences)
    return envelope({"regions": user.preferences.regions})


@router.post("/languages", dependencies=[Depends(rate_limiter.dependency("preferences:languages"))])
async def update_languages(
    payload: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Set preferred languages."""

    languages = payload.get("languages")
    if not isinstance(languages, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="languages must be a list")
    if user.preferences is None:
        user.preferences = UserPreferences(user_id=user.id)
    user.preferences.languages = languages
    session.add(user.preferences)
    await session.commit()
    await session.refresh(user.preferences)
    return envelope({"languages": user.preferences.languages})


@router.post(
    "/notifications",
    dependencies=[Depends(rate_limiter.dependency("preferences:notifications"))],
)
async def update_notifications(
    payload: dict,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Update notification settings."""

    notification_enabled = payload.get("notification_enabled", True)
    notification_time = payload.get("notification_time", "08:00")
    if user.preferences is None:
        user.preferences = UserPreferences(user_id=user.id)
    user.preferences.notification_enabled = bool(notification_enabled)
    user.preferences.notification_time = str(notification_time)
    session.add(user.preferences)
    await session.commit()
    await session.refresh(user.preferences)
    return envelope(
        {
            "notification_enabled": user.preferences.notification_enabled,
            "notification_time": user.preferences.notification_time,
        }
    )


__all__ = ["router"]
