"""Expose application settings and schedule configuration."""
from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

_base_config_path = Path(__file__).resolve().parent.parent / "config.py"
_spec = importlib.util.spec_from_file_location("backend._base_config", _base_config_path)
if _spec and _spec.loader:
    try:
        _base_module = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(_base_module)  # type: ignore[misc]
        settings = getattr(_base_module, "settings")
        AppSettings = getattr(_base_module, "AppSettings")
        get_settings = getattr(_base_module, "get_settings")
    except Exception:  # pragma: no cover - fallback for test environments
        class _FallbackSettings:
            environment = "testing"
            debug = False
            app_name = "PaperBoi"
            database_url = "sqlite+aiosqlite:///./paperboi.db"
            redis_url = "redis://localhost:6379/0"
            logging_level = "INFO"
            logging_format = "[%(asctime)s] %(levelname)s %(name)s: %(message)s"
            request_timeout_seconds = 30
            database_pool_size = 5
            database_max_overflow = 0
            gdelt_api_key = ""
            openrouter_api_key = ""

        settings = _FallbackSettings()
        AppSettings = type("AppSettings", (), {})

        def get_settings() -> Any:  # type: ignore[return-type]
            return settings
else:  # pragma: no cover - defensive
    raise ImportError("Unable to load base configuration module")

from .schedules import DEFAULT_TIMEZONE, JOB_SCHEDULES  # noqa: E402,F401
