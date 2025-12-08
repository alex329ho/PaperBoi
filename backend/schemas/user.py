"""User-related request and response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import Field, field_validator

from .base import BaseSchema
from backend.utils.email_validator import validate_email_address


class UserPreferencesBase(BaseSchema):
    """Shared attributes for user preference schemas."""

    topics: list[str] = Field(default_factory=list, description="Preferred news topics")
    regions: list[str] = Field(default_factory=list, description="Geographic regions of interest")
    languages: list[str] = Field(default_factory=list, description="Preferred content languages")
    notification_time: str = Field(default="08:00", description="Local time for notification delivery")
    notification_enabled: bool = Field(default=True, description="Enable scheduled notifications")


class UserPreferencesCreate(UserPreferencesBase):
    """Preferences payload for creation requests."""

    pass


class UserPreferencesRead(UserPreferencesBase):
    """Preferences returned in responses."""

    pass


class UserBase(BaseSchema):
    """Base attributes shared by user schemas."""

    email: str
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_email_address(value)


class UserCreate(UserBase):
    """Schema for user registration requests."""

    password: str = Field(min_length=8)
    preferences: Optional[UserPreferencesCreate] = None


class UserRead(UserBase):
    """User details returned in API responses."""

    id: int
    created_at: datetime
    updated_at: datetime
    preferences: Optional[UserPreferencesRead] = None
