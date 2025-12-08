"""Utility helpers for approximate token counting."""
from __future__ import annotations

import math
import re
from typing import Iterable


AVERAGE_CHARACTERS_PER_TOKEN = 4


def approx_token_count(text: str) -> int:
    """Return a fast, approximate token count for the provided text.

    The calculation is intentionally lightweight to avoid pulling heavyweight
    tokenizer dependencies. It approximates tokens by dividing total characters
    by a constant and adjusting for punctuation-heavy strings.

    Parameters
    ----------
    text:
        Raw text to evaluate.

    Returns
    -------
    int
        Estimated token count.
    """

    if not text:
        return 0

    normalized = re.sub(r"\s+", " ", text.strip())
    punctuation_bonus = len(re.findall(r"[\.,;:!\?]", normalized))
    estimated = (len(normalized) + punctuation_bonus) / AVERAGE_CHARACTERS_PER_TOKEN
    return int(math.ceil(estimated))


def count_tokens_for_messages(messages: Iterable[str]) -> int:
    """Return the summed approximate token count for multiple messages."""

    return sum(approx_token_count(message) for message in messages)
