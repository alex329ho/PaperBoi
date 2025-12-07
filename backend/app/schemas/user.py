"""User related request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.base import ORMBase, TimestampedSchema


class UserPreferencesBase(BaseModel):
    """Shared fields for user preferences."""

    topics: Optional[List[str]] = Field(default=None, description="Preferred topics")
    regions: Optional[List[str]] = Field(default=None, description="Preferred regions")
    languages: Optional[List[str]] = Field(default=None, description="Preferred languages")
    notification_time: Optional[time] = Field(default=None, description="Preferred notification time")
    notification_enabled: bool = Field(default=True, description="Should notifications be sent")


class UserPreferencesCreate(UserPreferencesBase):
    """Schema for creating preferences."""

    pass


class UserPreferencesResponse(UserPreferencesBase, ORMBase):
    """Preferences returned from the API."""

    id: int


class UserBase(BaseModel):
    """Reusable user properties."""

    email: EmailStr
    is_active: bool = Field(default=True, description="User is active flag")


class UserCreate(UserBase):
    """Schema for user registration payloads."""

    password: str = Field(min_length=8, description="User password")
    preferences: Optional[UserPreferencesCreate] = None


class UserResponse(UserBase, TimestampedSchema, ORMBase):
    """User data returned to clients."""

    id: uuid.UUID
    updated_at: datetime
    preferences: Optional[UserPreferencesResponse] = None


class TokenPayload(ORMBase):
    """JWT payload schema for issued tokens."""

    sub: uuid.UUID
    exp: int
