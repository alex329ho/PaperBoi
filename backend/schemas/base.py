"""Shared Pydantic schema utilities."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with configuration shared across responses."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TimestampSchema(BaseSchema):
    """Schema mixin exposing creation timestamp fields."""

    created_at: datetime | None = None
