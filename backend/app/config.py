"""Application configuration for PaperBoi using Pydantic BaseSettings."""
from __future__ import annotations

import secrets
from typing import List, Literal

from dotenv import load_dotenv
from pydantic import Field, HttpUrl, ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load environment variables from .env before settings are instantiated
load_dotenv()


class AppSettings(BaseSettings):
    """Strongly typed application settings.

    This configuration centralizes environment management for local development,
    automated testing, and production deployments. Values are parsed and validated
    on startup to avoid unexpected runtime failures.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="PaperBoi", description="Human readable service name")
    environment: Literal["development", "testing", "production"] = Field(
        default="development", description="Deployment environment"
    )
    debug: bool = Field(default=False, description="Toggle verbose logging")
    api_v1_prefix: str = Field(default="/api/v1", description="API version prefix")
    cors_origins: List[str] = Field(default_factory=lambda: ["*"], description="Allowed CORS origins")
    request_id_header: str = Field(default="X-Request-ID", description="Header used for tracing")

    database_url: str = Field(
        default="postgresql+asyncpg://paperboi:paperboi@localhost:5432/paperboi",
        description="SQLAlchemy database URL",
    )
    database_ssl_enabled: bool = Field(default=False, description="Require SSL for database connections")
    database_pool_size: int = Field(default=20, description="SQLAlchemy connection pool size")
    database_max_overflow: int = Field(default=0, description="SQLAlchemy max overflow connections")

    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")

    # External services
    gdelt_api_url: HttpUrl = Field(
        default="https://api.gdeltproject.org/api/v2/summary/summary", description="GDELT API endpoint"
    )
    gdelt_api_key: str = Field(default="", description="API key for GDELT")
    openrouter_api_key: str = Field(default="", description="API key for OpenRouter models")
    openrouter_model: str = Field(default="gpt-4.1-mini", description="Default OpenRouter model")
    firebase_project_id: str = Field(default="", description="Firebase project identifier")
    firebase_client_email: str = Field(default="", description="Firebase service account email")
    firebase_private_key: str = Field(default="", description="Firebase private key")

    # Email settings
    smtp_host: str = Field(default="localhost", description="SMTP server host")
    smtp_port: int = Field(default=587, description="SMTP server port")
    smtp_username: str = Field(default="", description="SMTP username")
    smtp_password: str = Field(default="", description="SMTP password")
    smtp_from_email: str = Field(default="no-reply@paperboi.app", description="Default sender email")
    smtp_use_tls: bool = Field(default=True, description="Use TLS for SMTP")

    # Auth
    jwt_secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), description="JWT signing secret")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    jwt_expiration_minutes: int = Field(default=60, description="JWT expiration in minutes")

    # Rate limiting
    rate_limit_enabled: bool = Field(default=False, description="Enable API rate limiting")
    rate_limit_requests_per_minute: int = Field(default=120, description="Requests allowed per minute per client")

    # Logging
    log_level: str = Field(default="INFO", description="Application log level")
    log_format: str = Field(
        default="%(asctime)s | %(levelname)s | %(name)s | %(request_id)s | %(message)s",
        description="Standard logging format",
    )
    json_logs: bool = Field(default=False, description="Emit logs in JSON format")

    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")
    cors_allow_methods: List[str] = Field(default_factory=lambda: ["*"], description="Allowed HTTP methods")
    cors_allow_headers: List[str] = Field(default_factory=lambda: ["*"], description="Allowed CORS headers")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: str | List[str]) -> List[str]:
        """Allow comma-separated origins via environment variables."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("environment")
    @classmethod
    def _validate_environment(cls, value: str) -> str:
        allowed = {"development", "testing", "production"}
        if value not in allowed:
            msg = f"Unsupported environment '{value}'. Allowed values: {', '.join(sorted(allowed))}."
            raise ValueError(msg)
        return value

    def ensure_valid(self) -> None:
        """Raise a descriptive error if environment values are invalid."""
        try:
            self.model_validate(self.model_dump())
        except ValidationError as exc:  # pragma: no cover - defensive guard
            raise RuntimeError("Invalid application configuration") from exc


settings = AppSettings()
