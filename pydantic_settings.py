"""Lightweight fallback for pydantic-settings in offline environments."""
from __future__ import annotations

from pydantic import BaseModel

SettingsConfigDict = dict


class BaseSettings(BaseModel):
    """Minimal stand-in replicating the BaseSettings interface."""

    model_config = SettingsConfigDict()
