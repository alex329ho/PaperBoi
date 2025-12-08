"""Pydantic models for OpenRouter chat completions API."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from schemas.base import BaseSchema


class OpenRouterMessage(BaseModel):
    """Represents a single message in the chat prompt."""

    role: str
    content: str


class OpenRouterRequest(BaseModel):
    """Request payload for the OpenRouter chat completions API."""

    model: str = Field(default="x-ai/grok-4.1-fast")
    messages: List[OpenRouterMessage]
    temperature: float = 0.7
    max_tokens: int | None = 500
    top_p: float = 0.9
    stream: bool | None = None


class OpenRouterResponseUsage(BaseSchema):
    """Token usage information returned by OpenRouter."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class OpenRouterChoice(BaseSchema):
    """Single choice returned by the completion."""

    finish_reason: Optional[str] = None
    message: OpenRouterMessage | None = None


class OpenRouterResponse(BaseSchema):
    """Response payload structure for chat completions."""

    id: str
    choices: List[OpenRouterChoice]
    usage: OpenRouterResponseUsage | None = None
    created: datetime | None = None

    # Example response for documentation:
    # {
    #   "id": "gen-...",
    #   "choices": [
    #     {
    #       "finish_reason": "stop",
    #       "message": {
    #         "content": "Summary text here...",
    #         "role": "assistant"
    #       }
    #     }
    #   ],
    #   "usage": {
    #     "prompt_tokens": 150,
    #     "completion_tokens": 100,
    #     "total_tokens": 250
    #   }
    # }
