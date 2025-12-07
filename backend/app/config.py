"""Application configuration module using Pydantic settings."""
from __future__ import annotations

from typing import Literal

from dotenv import load_dotenv
from pydantic import Field, HttpUrl, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """Centralized application settings loaded from the environment.

    The configuration uses Pydantic v2 for validation and includes sensible defaults
    suitable for local development. Environment variables can override any field.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    app_name: str = "PaperBoi"
    environment: Literal["development", "testing", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/paperboi"
    )
    database_ssl_mode: Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"] = "prefer"
    db_pool_size: int = 20
    db_max_overflow: int = 0

    redis_url: str = "redis://localhost:6379/0"

    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    gdelt_api_key: str = ""
    gdelt_api_url: HttpUrl | None = None
    openrouter_api_key: str = ""
    firebase_api_key: str = ""

    smtp_host: str = "localhost"
    smtp_port: int = 25
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = False
    smtp_from_email: str = "no-reply@paperboi.news"

    jwt_secret_key: str = "change-me"
    jwt_expiration_minutes: int = 1_440  # 24 hours

    log_level: str = "INFO"
    log_format: Literal["json", "plain"] = "json"

    request_timeout_seconds: int = 30
    request_id_header: str = "X-Request-ID"

    scheduler_timezone: str = "UTC"

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: list[str]) -> list[str]:
        """Ensure CORS origins are a list and never empty."""
        if not value:
            return ["*"]
        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Ensure the database URL uses an async driver suitable for SQLAlchemy."""
        if not value.startswith("postgresql+psycopg"):
            msg = "Database URL must use the 'postgresql+psycopg' driver for async support"
            raise ValueError(msg)
        return value

    @field_validator("environment")
    @classmethod
    def ensure_environment(cls, value: str) -> str:
        """Validate allowed environments and enforce secret requirements in production."""
        if value not in {"development", "testing", "production"}:
            msg = "Environment must be one of development, testing, or production"
            raise ValueError(msg)
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def ensure_secret(cls, value: str, info: ValidationInfo) -> str:
        """Prevent accidental use of weak secrets in production."""
        if info.data.get("environment") == "production" and value == "change-me":
            msg = "A strong JWT secret key is required in production"
            raise ValueError(msg)
        return value


settings = Settings()
