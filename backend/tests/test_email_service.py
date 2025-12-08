"""Unit tests for the PaperBoi email service."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict
from unittest.mock import patch

import pytest
pytest.importorskip("jinja2")

import sys

# Ensure project root is on the import path for module resolution
sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.email_service import EmailService
from services.smtp_manager import EmailProviderConfig, EmailRateLimitError, SMTPManager
from utils.email_validator import InvalidEmailError


class DummySMTP:
    """In-memory SMTP stub for testing."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.sent_messages: list[Any] = []
        self.logged_in = False
        self.started_tls = False

    def starttls(self) -> None:
        self.started_tls = True

    def login(self, username: str, password: str) -> None:
        self.logged_in = True

    def send_message(self, message: Any) -> Dict[str, str]:
        self.sent_messages.append(message)
        return {}

    def quit(self) -> None:  # pragma: no cover - cleanup hook
        return None


@pytest.fixture()
def smtp_config() -> EmailProviderConfig:
    return EmailProviderConfig(
        host="smtp.example.com",
        port=587,
        username="user",
        password="pass",
        use_tls=True,
        from_email="no-reply@example.com",
        from_name="PaperBoi",
        reply_to="support@example.com",
        rate_limit_per_hour=5,
    )


@pytest.fixture()
def service(smtp_config: EmailProviderConfig) -> EmailService:
    resolver = lambda user_id: {"email": f"{user_id}@example.com", "name": "Test User"}
    manager = SMTPManager(config=smtp_config)
    return EmailService(smtp_manager=manager, user_resolver=resolver)


@patch("smtplib.SMTP", return_value=DummySMTP())
def test_send_single_article_success(mock_smtp: Any, service: EmailService) -> None:
    article = {
        "title": "Breaking News",
        "summary": "A concise recap of important events.",
        "url": "https://example.com/article",
        "source": "Example News",
    }

    assert service.send_single_article("reader", article)
    statuses = list(service.delivery_log.values())
    assert statuses[-1].status.value == "sent"


@patch("smtplib.SMTP", return_value=DummySMTP())
def test_invalid_email_rejected(mock_smtp: Any, smtp_config: EmailProviderConfig) -> None:
    service = EmailService(
        smtp_manager=None,
        user_resolver=lambda _: {"email": "not-an-email", "name": "Bad Actor"},
    )
    with pytest.raises(InvalidEmailError):
        service.send_welcome_email("reader")


@patch("smtplib.SMTP", return_value=DummySMTP())
def test_rate_limit_enforced(mock_smtp: Any, smtp_config: EmailProviderConfig) -> None:
    limited_config = EmailProviderConfig(
        host="smtp.example.com",
        port=587,
        username="user",
        password="pass",
        use_tls=True,
        from_email="no-reply@example.com",
        from_name="PaperBoi",
        reply_to="support@example.com",
        rate_limit_per_hour=1,
    )
    manager = SMTPManager(config=limited_config)
    service = EmailService(
        smtp_manager=manager,
        user_resolver=lambda _: {"email": "reader@example.com", "name": "Rate Limited"},
    )
    # First send should work
    assert service.send_welcome_email("reader")
    # Second send should exceed rate limit
    with pytest.raises(EmailRateLimitError):
        service.send_welcome_email("reader")


@pytest.mark.asyncio()
@patch("smtplib.SMTP", return_value=DummySMTP())
async def test_schedule_records_status(mock_smtp: Any, service: EmailService) -> None:
    send_time = datetime.utcnow() + timedelta(seconds=0.2)
    email_id = service.schedule_email("reader", send_time)
    status = service.get_delivery_status(email_id)
    assert status["status"] == "scheduled"
    await asyncio.sleep(0.3)
    # After scheduled send, status should be updated
    final_status = service.delivery_log[email_id]
    assert final_status.status.value in {"sent", "failed"}
