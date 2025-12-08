"""Authentication endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.dependencies import (
    generate_reset_token,
    get_db_session,
    get_redis,
    hash_password,
    issue_token_pair,
    verify_password,
)
from backend.middleware.rate_limit import RateLimiter
from backend.models.user import User, UserPreferences
from backend.utils.email_validator import validate_email_address
from backend.utils.logger import get_logger

router = APIRouter(prefix="/auth", tags=["auth"])
logger = get_logger(__name__)
rate_limiter = RateLimiter()


def envelope(data: Any, message: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": True, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    if message:
        payload["message"] = message
    return payload


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_email_address(value)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_email_address(value)


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return validate_email_address(value)


class PasswordConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


@router.post("/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limiter.dependency("auth:register"))])
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Create a new user account."""

    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)

    prefs = UserPreferences(user_id=user.id)
    session.add(prefs)
    await session.commit()

    data = {
        "user_id": str(user.id),
        "email": user.email,
        "name": payload.name,
        "created_at": user.created_at,
    }
    return envelope(data, message="User registered successfully")


@router.post("/login", dependencies=[Depends(rate_limiter.dependency("auth:login"))])
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Authenticate and return JWT tokens."""

    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    tokens = await issue_token_pair(str(user.id))
    return envelope(tokens)


@router.post("/refresh", dependencies=[Depends(rate_limiter.dependency("auth:refresh"))])
async def refresh(payload: RefreshRequest) -> Dict[str, Any]:
    """Refresh an expired access token."""

    from backend.dependencies import decode_token

    decoded = decode_token(payload.refresh_token, verify_type="refresh")
    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    tokens = await issue_token_pair(str(user_id))
    return envelope(tokens)


@router.post("/logout", dependencies=[Depends(rate_limiter.dependency("auth:logout"))])
async def logout() -> Dict[str, Any]:
    """Placeholder logout endpoint for stateless JWTs."""

    return envelope({}, message="Token revoked")


@router.post("/password-reset", dependencies=[Depends(rate_limiter.dependency("auth:password-reset"))])
async def password_reset(
    payload: PasswordResetRequest, redis_client: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """Request a password reset token."""

    token = generate_reset_token()
    await redis_client.setex(f"password-reset:{token}", 900, payload.email)
    return envelope({"email": payload.email, "token": token}, message="Reset token generated")


@router.post("/password-confirm", dependencies=[Depends(rate_limiter.dependency("auth:password-confirm"))])
async def password_confirm(
    payload: PasswordConfirmRequest,
    session: AsyncSession = Depends(get_db_session),
    redis_client: Redis = Depends(get_redis),
) -> Dict[str, Any]:
    """Confirm a password reset using the issued token."""

    stored = await redis_client.get(f"password-reset:{payload.token}")
    if not stored:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    result = await session.execute(select(User).where(User.email == stored))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    await session.commit()
    return envelope({}, message="Password updated")


__all__ = ["router"]
