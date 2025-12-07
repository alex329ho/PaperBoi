"""Application configuration module using Pydantic settings."""
from __future__ import annotations

from functools import lru_cache
from typing import List, Literal

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env as early as possible to populate environment variables for settings
load_dotenv()


class AppSettings(BaseSettings):
    """Centralized application configuration.

    All external configuration is provided via environment variables with the
    prefix ``PAPERBOI_``. Defaults are intentionally sensible for local
    development while remaining secure for production usage when overridden.
    """

    environment: Literal["development", "testing", "production"] = "development"
    debug: bool = False
    app_name: str = "PaperBoi"
    api_v1_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/paperboi",
        description="SQLAlchemy database URL with async driver",
    )
    database_ssl_mode: Literal["disable", "prefer", "require", "verify-full"] = "prefer"
    database_pool_size: int = 20
    database_max_overflow: int = 0

    redis_url: str = "redis://localhost:6379/0"

    gdelt_api_key: str = ""
    openrouter_api_key: str = ""
    firebase_api_key: str = ""

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = False
    smtp_from_email: str = "no-reply@paperboi.app"

    api_rate_limit_per_minute: int = 120

    logging_level: str = "INFO"
    logging_format: str = "[%(asctime)s] %(levelname)s [%(request_id)s] %(name)s: %(message)s"

    cors_origins: List[str] = Field(default_factory=list)

    jwt_secret_key: str = "change_this_secret"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    request_timeout_seconds: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="PAPERBOI_",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | List[str]) -> List[str]:
        """Allow comma-separated CORS origins for easy environment overrides."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("logging_level", mode="before")
    @classmethod
    def validate_logging_level(cls, value: str) -> str:
        """Normalize logging level names to uppercase for consistency."""
        return value.upper()

    @field_validator("database_url")
    @classmethod
    def ensure_async_driver(cls, value: str) -> str:
        """Validate that the database URL is configured for async access."""
        if "+asyncpg" not in value:
            raise ValueError("Database URL must use an async driver such as asyncpg")
        return value

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        """Ensure the environment flag matches one of the supported options."""
        allowed = {"development", "testing", "production"}
        if value not in allowed:
            raise ValueError(f"Invalid environment: {value}. Allowed: {', '.join(sorted(allowed))}")
        return value

    def require_secure_configuration(self) -> None:
        """Perform runtime validation for production readiness.

        The method raises ``ValueError`` when minimum security requirements are
        not met to prevent the application from starting with weak secrets.
        """

        if self.environment == "production":
            if not self.jwt_secret_key or self.jwt_secret_key == "change_this_secret":
                raise ValueError("JWT secret key must be configured for production")
            if not self.gdelt_api_key:
                raise ValueError("GDELT API key must be configured for production")

    @property
    def allow_origins(self) -> List[str]:
        """Return the configured CORS whitelist or default to public access."""
        return self.cors_origins or ["*"]


@lru_cache
def get_settings() -> AppSettings:
    """Return a cached instance of ``AppSettings`` for dependency injection."""

    settings = AppSettings()
    settings.require_secure_configuration()
    return settings


# Expose a module-level settings object for convenient imports
settings = get_settings()
