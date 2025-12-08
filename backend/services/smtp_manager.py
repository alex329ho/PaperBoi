"""SMTP connection management with rate limiting and retries."""
from __future__ import annotations

import asyncio
import smtplib
from collections import deque
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Deque, Dict, Iterable, Optional

from config import settings
from utils.logger import get_logger


class EmailRateLimitError(Exception):
    """Raised when the SMTP provider rate limit is exceeded."""


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered."""


@dataclass(slots=True)
class EmailProviderConfig:
    """Configuration for connecting to an SMTP provider."""

    host: str
    port: int
    username: str
    password: str
    use_tls: bool
    from_email: str
    from_name: str
    reply_to: str
    provider: str = "smtp"
    rate_limit_per_hour: int = 300

    @property
    def from_header(self) -> str:
        return f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email


class SMTPManager:
    """Manage SMTP connections, rate limiting, and retries."""

    def __init__(self, config: EmailProviderConfig | None = None) -> None:
        self.config = config or EmailProviderConfig(
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            use_tls=settings.smtp_use_tls,
            from_email=settings.smtp_from_email,
            from_name=settings.smtp_from_name,
            reply_to=settings.smtp_reply_to,
            provider=settings.smtp_provider,
            rate_limit_per_hour=settings.smtp_rate_limit_per_hour,
        )
        self._apply_provider_defaults()
        self._connection: smtplib.SMTP | None = None
        self._send_timestamps: Deque[float] = deque()
        self.logger = get_logger(__name__)

    def _apply_provider_defaults(self) -> None:
        """Normalize provider-specific defaults when not explicitly configured."""

        default_hosts = {"", "localhost"}
        if self.config.provider == "gmail":
            if self.config.host in default_hosts:
                self.config.host = "smtp.gmail.com"
            if not self.config.port:
                self.config.port = 587
            self.config.use_tls = True
        elif self.config.provider == "sendgrid":
            if self.config.host in default_hosts:
                self.config.host = "smtp.sendgrid.net"
            if not self.config.port:
                self.config.port = 587
            if self.config.username == "":
                self.config.username = "apikey"

    def _connect(self) -> smtplib.SMTP:
        if self._connection:
            return self._connection

        self.logger.debug("Opening SMTP connection", extra={"host": self.config.host, "port": self.config.port})
        client = smtplib.SMTP(self.config.host, self.config.port, timeout=30)
        try:
            if self.config.use_tls:
                client.starttls()
            if self.config.username:
                client.login(self.config.username, self.config.password)
        except smtplib.SMTPException as exc:
            client.quit()
            raise EmailDeliveryError(f"Failed to authenticate with SMTP provider: {exc}")

        self._connection = client
        return client

    def _disconnect(self) -> None:
        if self._connection:
            try:
                self._connection.quit()
            finally:
                self._connection = None

    def _enforce_rate_limit(self) -> None:
        from time import time

        now = time()
        cutoff = now - 3600
        while self._send_timestamps and self._send_timestamps[0] < cutoff:
            self._send_timestamps.popleft()

        if len(self._send_timestamps) >= self.config.rate_limit_per_hour:
            raise EmailRateLimitError("SMTP rate limit exceeded")

        self._send_timestamps.append(now)

    def build_message(
        self,
        *,
        recipients: Iterable[str],
        subject: str,
        html_content: str,
        plain_content: str,
        headers: Optional[Dict[str, str]] = None,
    ) -> EmailMessage:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.config.from_header
        message["To"] = ", ".join(recipients)
        message["Reply-To"] = self.config.reply_to
        for key, value in (headers or {}).items():
            message[key] = value
        message.set_content(plain_content)
        message.add_alternative(html_content, subtype="html")
        return message

    def send(self, message: EmailMessage) -> Dict[str, str]:
        self._enforce_rate_limit()
        client = self._connect()

        try:
            refused = client.send_message(message)
            if refused:
                raise EmailDeliveryError(f"Provider refused recipients: {refused}")
            return {}
        except (smtplib.SMTPServerDisconnected, smtplib.SMTPResponseException, smtplib.SMTPDataError) as exc:
            self.logger.warning("SMTP transient failure, retrying", extra={"error": str(exc)})
            self._disconnect()
            raise
        except smtplib.SMTPException as exc:
            self.logger.error("SMTP send failed", extra={"error": str(exc)})
            raise EmailDeliveryError(str(exc))

    async def send_async(self, message: EmailMessage) -> Dict[str, str]:
        return await asyncio.to_thread(self.send, message)

    async def send_with_retry(self, message: EmailMessage, *, retries: int = 5) -> Dict[str, str]:
        delay = 1.0
        attempt = 1
        while True:
            try:
                return await self.send_async(message)
            except (EmailRateLimitError, EmailDeliveryError):
                raise
            except smtplib.SMTPException as exc:
                if attempt >= retries:
                    raise EmailDeliveryError(str(exc))
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
                attempt += 1
                self.logger.info("Retrying SMTP send", extra={"attempt": attempt, "delay": delay})

    def close(self) -> None:
        self._disconnect()

    def __del__(self) -> None:  # pragma: no cover - best effort cleanup
        self._disconnect()
