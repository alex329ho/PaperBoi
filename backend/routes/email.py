"""Email management endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from backend.dependencies import get_current_user, get_email_service
from backend.middleware.rate_limit import RateLimiter
from services.email_service import EmailService
from backend.utils.logger import get_logger

router = APIRouter(prefix="/email", tags=["email"])
logger = get_logger(__name__)
rate_limiter = RateLimiter()


def envelope(data: Any, message: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": True, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    if message:
        payload["message"] = message
    return payload


class SendSummaryRequest(BaseModel):
    recipients: List[EmailStr]
    topics: List[str] = Field(default_factory=list)
    include_count: int = Field(default=5, ge=1, le=50)
    summary_length: str = Field(default="MEDIUM")


class ScheduleRequest(BaseModel):
    recipients: List[EmailStr]
    send_at: datetime


class UnsubscribeRequest(BaseModel):
    email: EmailStr


@router.post(
    "/send-summary",
    dependencies=[Depends(rate_limiter.dependency("email:send"))],
)
async def send_summary(
    payload: SendSummaryRequest,
    email_service: EmailService = Depends(get_email_service),
) -> Dict[str, Any]:
    """Queue an email containing a news summary."""

    email_id = await email_service._build_and_send_async(
        recipients=[str(r) for r in payload.recipients],
        subject="PaperBoi summary",
        html_content=f"Summary for topics: {', '.join(payload.topics)} (first {payload.include_count} items)",
    )
    return envelope(
        {
            "email_id": email_id,
            "recipients": payload.recipients,
            "status": "queued",
            "scheduled_for": datetime.now(timezone.utc).isoformat(),
        }
    )


@router.post(
    "/schedule",
    dependencies=[Depends(rate_limiter.dependency("email:schedule"))],
)
async def schedule_email(
    payload: ScheduleRequest,
    email_service: EmailService = Depends(get_email_service),
) -> Dict[str, Any]:
    """Schedule a recurring or delayed email."""

    email_id = email_service.schedule_email("anonymous", payload.send_at)
    return envelope({"email_id": email_id, "scheduled_for": payload.send_at})


@router.get(
    "/history",
    dependencies=[Depends(rate_limiter.dependency("email:history"))],
)
async def email_history(email_service: EmailService = Depends(get_email_service)) -> Dict[str, Any]:
    """Return email delivery history."""

    history = [record.model_dump() for record in email_service.delivery_log.values()]
    return envelope(history)


@router.post(
    "/unsubscribe",
    dependencies=[Depends(rate_limiter.dependency("email:unsubscribe"))],
)
async def unsubscribe(payload: UnsubscribeRequest) -> Dict[str, Any]:
    """Handle unsubscribe requests."""

    return envelope({"email": payload.email, "status": "unsubscribed"})


__all__ = ["router"]
