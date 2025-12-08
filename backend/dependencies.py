"""Shared dependency declarations for FastAPI routes and middleware."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, AsyncGenerator, Optional

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import get_session
from models.user import User
from services.email_service import EmailService
from services.gdelt_service import GDELTService
from services.summarization import SummarizationService
from utils.logger import get_logger

logger = get_logger(__name__)
security_scheme = HTTPBearer(auto_error=False)
password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

_redis_client: Redis | None = None


async def get_redis() -> Redis:
    """Provide a lazy-initialized Redis client.

    Raises
    ------
    HTTPException
        If the Redis client cannot be created.
    """

    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
            await _redis_client.ping()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unable to initialize Redis client", extra={"error": str(exc)})
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Cache backend unavailable",
            ) from exc
    return _redis_client


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Wrapper around the shared SQLAlchemy session dependency."""

    async for session in get_session():
        yield session


def create_access_token(subject: str, expires_minutes: int | None = None, *, token_type: str = "access") -> str:
    """Generate a signed JWT token."""

    expiration = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.jwt_expiration_minutes)
    payload = {"sub": subject, "exp": expiration, "type": token_type}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, verify_type: Optional[str] = None) -> dict:
    """Decode and validate a JWT token."""

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:  # pragma: no cover - safety
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:  # pragma: no cover - safety
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if verify_type and payload.get("type") != verify_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    return payload


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Validate a password against a stored hash."""

    return password_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""

    return password_context.hash(password)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)],
    session: AsyncSession = Depends(get_db_session),
) -> User:
    """Resolve the authenticated user from a bearer token."""

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    token = credentials.credentials
    payload = decode_token(token, verify_type="access")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    result = await session.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)],
    session: AsyncSession = Depends(get_db_session),
) -> User | None:
    """Return the authenticated user if present, otherwise ``None``."""

    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, session)  # type: ignore[arg-type]
    except HTTPException:
        return None


async def get_gdelt_service(
    session: AsyncSession = Depends(get_db_session),
    redis_client: Redis = Depends(get_redis),
) -> GDELTService:
    """Instantiate the GDELT service with required dependencies."""

    return GDELTService(session, redis_client)


async def get_summarization_service(redis_client: Redis = Depends(get_redis)) -> SummarizationService:
    """Create the summarization orchestrator."""

    return SummarizationService(redis_client)


async def get_email_service() -> EmailService:
    """Provide an email service instance."""

    return EmailService()


async def generate_refresh_token(subject: str) -> str:
    """Generate a refresh token with longer expiry."""

    return create_access_token(subject, expires_minutes=settings.jwt_expiration_minutes * 24, token_type="refresh")


async def issue_token_pair(user_id: str) -> dict[str, str | int]:
    """Create access and refresh tokens with metadata."""

    access_token = create_access_token(user_id)
    refresh_token = await generate_refresh_token(user_id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_expiration_minutes * 60,
    }


def generate_reset_token() -> str:
    """Return a secure token for password resets."""

    return secrets.token_urlsafe(32)

__all__ = [
    "get_db_session",
    "get_redis",
    "get_current_user",
    "get_optional_user",
    "get_gdelt_service",
    "get_summarization_service",
    "get_email_service",
    "hash_password",
    "verify_password",
    "issue_token_pair",
    "create_access_token",
    "decode_token",
    "generate_reset_token",
]
