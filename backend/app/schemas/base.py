"""Shared Pydantic schema components."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMBaseModel(BaseModel):
    """Base Pydantic model configured for ORM mode and documentation reuse."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TimestampMixin(ORMBaseModel):
    """Common timestamp fields applied to many schemas."""

    created_at: datetime
    updated_at: datetime | None = None
