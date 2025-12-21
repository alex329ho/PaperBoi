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
            api_v1_prefix = "/api/v1"
            host = "0.0.0.0"
            port = 8000
            api_rate_limit_per_minute = 120
            database_url = "sqlite+aiosqlite:///./paperboi.db"
            database_ssl_mode = "prefer"
            database_pool_size = 20
            database_max_overflow = 0
            redis_url = "redis://localhost:6379/0"
            gdelt_api_url = "https://api.gdeltproject.org/api/v2/doc/doc"
            gdelt_api_key = ""
            openrouter_api_key = ""
            firebase_api_key = ""
            smtp_provider = "smtp"
            smtp_host = "localhost"
            smtp_port = 1025
            smtp_username = ""
            smtp_password = ""
            smtp_use_tls = False
            smtp_from_email = "no-reply@paperboi.app"
            smtp_from_name = "PaperBoi"
            smtp_reply_to = "support@paperboi.app"
            smtp_rate_limit_per_hour = 300
            sendgrid_api_key = ""
            logging_level = "INFO"
            logging_format = "[%(asctime)s] %(levelname)s %(name)s: %(message)s"
            cors_origins = []
            jwt_secret_key = "change_this_secret"
            jwt_algorithm = "HS256"
            jwt_expiration_minutes = 60
            request_timeout_seconds = 30

            def require_secure_configuration(self) -> None:
                return None

            @property
            def allow_origins(self) -> list[str]:
                return self.cors_origins or ["*"]

        settings = _FallbackSettings()
        AppSettings = type("AppSettings", (), {})

        def get_settings() -> Any:  # type: ignore[return-type]
            return settings
else:  # pragma: no cover - defensive
    raise ImportError("Unable to load base configuration module")

from .schedules import DEFAULT_TIMEZONE, JOB_SCHEDULES  # noqa: E402,F401
