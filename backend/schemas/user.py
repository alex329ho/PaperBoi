"""User-related request and response schemas."""
from __future__ import annotations

from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.schemas.base import ORMBaseModel


class UserPreferencesBase(BaseModel):
    """Base model for user preferences."""

    topics: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    notification_time: time | None = None
    notification_enabled: bool = True


class UserPreferencesCreate(UserPreferencesBase):
    """Preferences payload for creation."""


class UserPreferencesResponse(UserPreferencesBase, ORMBaseModel):
    """Preferences representation returned to clients."""

    user_id: UUID


class UserBase(BaseModel):
    """Common user fields."""

    email: EmailStr
    is_active: bool = True


class UserCreate(UserBase):
    """Payload for creating a new user."""

    password: str = Field(min_length=8, max_length=128)
    preferences: UserPreferencesCreate | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """Ensure password strength constraints."""
        if value.isnumeric():
            raise ValueError("Password must contain non-numeric characters")
        return value


class UserResponse(UserBase, ORMBaseModel):
    """User representation used in responses."""

    id: UUID
    created_at: datetime
    updated_at: datetime | None = None
    preferences: UserPreferencesResponse | None = None


class UserLoginRequest(BaseModel):
    """Schema for login requests."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
