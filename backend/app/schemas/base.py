"""Shared schema utilities."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMBase(BaseModel):
    """Base schema configured for ORM mode."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, arbitrary_types_allowed=True)


class TimestampedSchema(ORMBase):
    """Common timestamp fields for API responses."""

    created_at: datetime

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}
