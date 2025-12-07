"""Application configuration settings using environment variables."""
from pydantic import BaseSettings, Field, HttpUrl


class Settings(BaseSettings):
    """Base configuration for the PaperBoi backend.

    Values are loaded from environment variables with optional defaults for development.
    """

    app_name: str = Field(default="PaperBoi Backend", description="Human-readable app name")
    environment: str = Field(default="development", description="Deployment environment")
    debug: bool = Field(default=True, description="Enable debug logging")
    secret_key: str = Field(default="change-me", description="JWT signing key")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(default=60, description="JWT expiration in minutes")

    database_url: str = Field(
        default="postgresql+psycopg://paperboi:paperboi@db:5432/paperboi",
        description="SQLAlchemy-compatible database URL",
    )
    redis_url: str = Field(default="redis://cache:6379/0", description="Redis connection URL")

    gdelt_api_url: HttpUrl = Field(default="https://api.gdeltproject.org/api/v2/summary/summary", description="GDELT API endpoint")
    openrouter_api_key: str = Field(default="", description="OpenRouter API key for Grok summarization")
    openrouter_model: str = Field(default="grok-4.1-fast", description="OpenRouter model identifier")

    firebase_project_id: str = Field(default="", description="Firebase project identifier")
    firebase_client_email: str = Field(default="", description="Firebase client email")
    firebase_private_key: str = Field(default="", description="Firebase private key")

    scheduler_timezone: str = Field(default="UTC", description="Timezone for APScheduler")
    scheduler_news_cron: str = Field(default="0 */2 * * *", description="Cron schedule for news fetch")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
