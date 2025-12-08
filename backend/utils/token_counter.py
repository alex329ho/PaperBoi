"""Lightweight helpers for approximating token counts for LLM requests."""
from __future__ import annotations

import math
from typing import Iterable


AVERAGE_CHARACTERS_PER_TOKEN = 4


def estimate_tokens(text: str | Iterable[str]) -> int:
    """Estimate the number of tokens for the provided text.

    The calculation uses a coarse heuristic of ~4 characters per token which
    mirrors common GPT-style tokenization. This is intentionally lightweight
    to avoid heavy tokenizer dependencies while remaining directionally
    accurate for budgeting and rate-limit safeguards.

    Parameters
    ----------
    text:
        A single string or iterable of strings to evaluate.

    Returns
    -------
    int
        Estimated token count (minimum of 1).
    """

    if isinstance(text, str):
        content = text
    else:
        content = " ".join(text)

    if not content:
        return 1

    return max(1, math.ceil(len(content) / AVERAGE_CHARACTERS_PER_TOKEN))
