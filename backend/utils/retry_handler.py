"""Reusable retry helpers with exponential backoff."""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, Iterable, TypeVar

ReturnType = TypeVar("ReturnType")


async def execute_with_retry(
    func: Callable[[], Awaitable[ReturnType]],
    exceptions: Iterable[type[BaseException]],
    *,
    retries: int = 5,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    max_delay: float = 30.0,
    logger: logging.Logger | None = None,
) -> ReturnType:
    """Execute an async callable with exponential backoff on failure.

    Parameters
    ----------
    func:
        Async callable to execute.
    exceptions:
        Iterable of exception classes that should trigger a retry.
    retries:
        Maximum number of attempts including the first execution.
    base_delay:
        Initial delay in seconds before the first retry.
    backoff_factor:
        Multiplier applied to the delay after each failed attempt.
    max_delay:
        Maximum delay between retries.
    logger:
        Optional logger for emitting retry diagnostics.

    Raises
    ------
    Exception
        Propagates the last caught exception after exhausting retries.
    """

    attempt = 1
    while True:
        try:
            return await func()
        except tuple(exceptions) as exc:  # type: ignore[arg-type]
            if attempt >= retries:
                raise

            delay = min(base_delay * (backoff_factor ** (attempt - 1)), max_delay)
            if logger:
                logger.warning(
                    "Retrying after failure", extra={"attempt": attempt, "delay": delay, "error": str(exc)}
                )
            await asyncio.sleep(delay)
            attempt += 1
