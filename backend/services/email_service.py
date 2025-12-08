"""Email delivery service for PaperBoi."""
from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Callable, Dict, List, Mapping, MutableMapping
from uuid import uuid4

from backend.schemas.email import BatchEmailResponse, EmailDeliveryRecord, EmailStatus, SingleArticlePayload
from backend.services.smtp_manager import EmailDeliveryError, EmailRateLimitError, SMTPManager
from backend.utils.email_validator import InvalidEmailError, validate_email_address, validate_email_addresses
from backend.utils.html_builder import (
    html_to_text,
    render_daily_summary,
    render_single_article,
    render_welcome_email,
)
from backend.utils.logger import get_logger

DEFAULT_PREFERENCES_URL = "https://paperboi.app/preferences"
DEFAULT_UNSUBSCRIBE_URL = "https://paperboi.app/unsubscribe"
DEFAULT_FAQ_URL = "https://paperboi.app/faq"


class EmailService:
    """Coordinate templating, delivery, and auditing for outbound email."""

    def __init__(
        self,
        *,
        smtp_manager: SMTPManager | None = None,
        user_resolver: Callable[[str], Mapping[str, Any] | None] | None = None,
    ) -> None:
        self.smtp_manager = smtp_manager or SMTPManager()
        self.user_resolver = user_resolver or (lambda user_id: {"email": user_id, "name": None})
        self.logger = get_logger(__name__)
        self.delivery_log: MutableMapping[str, EmailDeliveryRecord] = {}
        self.dead_letter_queue: List[EmailDeliveryRecord] = []

    def _resolve_user(self, user_id: str) -> Mapping[str, Any]:
        user = self.user_resolver(user_id)
        if not user:
            raise ValueError(f"Unable to resolve user for id {user_id}")
        return user

    def _record_status(
        self, *, email_id: str, recipients: List[str], subject: str, status: EmailStatus, last_error: str | None = None
    ) -> None:
        record = EmailDeliveryRecord(
            email_id=email_id,
            recipients=recipients,
            status=status,
            subject=subject,
            last_error=last_error,
            updated_at=datetime.utcnow(),
        )
        self.delivery_log[email_id] = record
        if status in {EmailStatus.FAILED, EmailStatus.BOUNCED}:
            self.dead_letter_queue.append(record)

    def _build_and_send(self, recipients: List[str], subject: str, html_content: str) -> str:
        normalized = validate_email_addresses(recipients)
        plain_content = html_to_text(html_content)
        message = self.smtp_manager.build_message(
            recipients=normalized,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            headers={"List-Unsubscribe": f"<{DEFAULT_UNSUBSCRIBE_URL}>"},
        )

        email_id = str(uuid4())
        try:
            self.smtp_manager.send(message)
            self._record_status(email_id=email_id, recipients=normalized, subject=subject, status=EmailStatus.SENT)
            self.logger.info("Email sent", extra={"email_id": email_id, "recipients": normalized})
            return email_id
        except (EmailDeliveryError, EmailRateLimitError, InvalidEmailError) as exc:
            self._record_status(
                email_id=email_id,
                recipients=normalized,
                subject=subject,
                status=EmailStatus.FAILED,
                last_error=str(exc),
            )
            self.logger.error("Email send failed", extra={"email_id": email_id, "error": str(exc)})
            raise

    async def _build_and_send_async(self, recipients: List[str], subject: str, html_content: str) -> str:
        normalized = validate_email_addresses(recipients)
        plain_content = html_to_text(html_content)
        message = self.smtp_manager.build_message(
            recipients=normalized,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            headers={"List-Unsubscribe": f"<{DEFAULT_UNSUBSCRIBE_URL}>"},
        )

        email_id = str(uuid4())
        try:
            await self.smtp_manager.send_with_retry(message)
            self._record_status(email_id=email_id, recipients=normalized, subject=subject, status=EmailStatus.SENT)
            self.logger.info("Async email sent", extra={"email_id": email_id, "recipients": normalized})
            return email_id
        except (EmailDeliveryError, EmailRateLimitError, InvalidEmailError) as exc:
            self._record_status(
                email_id=email_id,
                recipients=normalized,
                subject=subject,
                status=EmailStatus.FAILED,
                last_error=str(exc),
            )
            self.logger.error("Async email send failed", extra={"email_id": email_id, "error": str(exc)})
            raise

    def send_daily_summary(self, user_id: str, summaries: List[Dict[str, Any]]) -> bool:
        """Send a daily summary email to a user."""

        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_daily_summary(
            user_name=user.get("name"),
            summaries=summaries,
            preferences_url=DEFAULT_PREFERENCES_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        self._build_and_send([recipient], f"Your PaperBoi digest for {datetime.utcnow():%B %d}", html)
        return True

    def send_single_article(self, user_id: str, article: Dict[str, Any]) -> bool:
        """Send a single article notification."""

        payload = SingleArticlePayload.model_validate(article)
        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_single_article(
            user_name=user.get("name"),
            article=payload.model_dump(),
            preferences_url=DEFAULT_PREFERENCES_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        self._build_and_send([recipient], f"New article: {payload.title}", html)
        return True

    def send_welcome_email(self, user_id: str) -> bool:
        """Send a welcome email to a user."""

        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_welcome_email(
            user_name=user.get("name"),
            preferences_url=DEFAULT_PREFERENCES_URL,
            faq_url=DEFAULT_FAQ_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        self._build_and_send([recipient], "Welcome to PaperBoi", html)
        return True

    def send_batch_email(self, recipients: List[str], subject: str, html_content: str) -> BatchEmailResponse:
        """Send a templated email to multiple recipients."""

        validated = validate_email_addresses(recipients)
        plain_content = html_to_text(html_content)
        message = self.smtp_manager.build_message(
            recipients=validated,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            headers={"List-Unsubscribe": f"<{DEFAULT_UNSUBSCRIBE_URL}>"},
        )

        email_id = str(uuid4())
        failed: Dict[str, str] = {}
        try:
            refused = self.smtp_manager.send(message)
            if refused:
                failed.update({k: v for k, v in refused.items()})
                status = EmailStatus.BOUNCED
            else:
                status = EmailStatus.SENT
            self._record_status(email_id=email_id, recipients=validated, subject=subject, status=status)
            return BatchEmailResponse(email_id=email_id, sent=validated if not failed else [], failed=failed)
        except (EmailDeliveryError, EmailRateLimitError) as exc:
            failed = {email: str(exc) for email in validated}
            self._record_status(
                email_id=email_id,
                recipients=validated,
                subject=subject,
                status=EmailStatus.FAILED,
                last_error=str(exc),
            )
            raise

    def schedule_email(self, user_id: str, send_time: datetime) -> str:
        """Schedule a digest email at a future time using asyncio."""

        email_id = str(uuid4())
        subject = f"Scheduled PaperBoi digest for {send_time:%B %d}"
        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        recipients: List[str] = [recipient]

        async def _task() -> None:
            await asyncio.sleep(max((send_time - datetime.utcnow()).total_seconds(), 0))
            html = render_daily_summary(
                user_name=user.get("name"),
                summaries=[],
                preferences_url=DEFAULT_PREFERENCES_URL,
                unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
            )
            try:
                await self._build_and_send_async([recipient], subject, html)
            except Exception as exc:  # pragma: no cover - defensive logging path
                self.logger.error("Scheduled email failed", extra={"email_id": email_id, "error": str(exc)})

        self._record_status(email_id=email_id, recipients=recipients, subject=subject, status=EmailStatus.SCHEDULED)
        asyncio.create_task(_task())
        return email_id

    def get_delivery_status(self, email_id: str) -> Dict[str, Any]:
        """Return delivery status metadata for an email."""

        record = self.delivery_log.get(email_id)
        if not record:
            raise KeyError(f"No email found for id {email_id}")
        return record.model_dump()

    async def send_daily_summary_async(self, user_id: str, summaries: List[Dict[str, Any]]) -> bool:
        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_daily_summary(
            user_name=user.get("name"),
            summaries=summaries,
            preferences_url=DEFAULT_PREFERENCES_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        await self._build_and_send_async([recipient], f"Your PaperBoi digest for {datetime.utcnow():%B %d}", html)
        return True

    async def send_single_article_async(self, user_id: str, article: Dict[str, Any]) -> bool:
        payload = SingleArticlePayload.model_validate(article)
        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_single_article(
            user_name=user.get("name"),
            article=payload.model_dump(),
            preferences_url=DEFAULT_PREFERENCES_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        await self._build_and_send_async([recipient], f"New article: {payload.title}", html)
        return True

    async def send_welcome_email_async(self, user_id: str) -> bool:
        user = self._resolve_user(user_id)
        recipient = validate_email_address(user.get("email", ""))
        html = render_welcome_email(
            user_name=user.get("name"),
            preferences_url=DEFAULT_PREFERENCES_URL,
            faq_url=DEFAULT_FAQ_URL,
            unsubscribe_url=DEFAULT_UNSUBSCRIBE_URL,
        )
        await self._build_and_send_async([recipient], "Welcome to PaperBoi", html)
        return True
