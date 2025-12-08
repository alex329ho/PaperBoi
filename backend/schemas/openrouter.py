"""Pydantic models for OpenRouter chat completion API interactions."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Represents a single chat message in OpenRouter format."""

    role: Literal["system", "user", "assistant"]
    content: str


class ChatCompletionRequest(BaseModel):
    """Schema for OpenRouter chat completion requests."""

    model: str = Field(default="x-ai/grok-4.1-fast")
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 500
    top_p: float = 0.9
    stream: Optional[bool] = False


class UsageStats(BaseModel):
    """Token usage details returned by OpenRouter."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatChoice(BaseModel):
    """Single choice from a chat completion response."""

    finish_reason: Optional[str] = None
    message: ChatMessage


class ChatCompletionResponse(BaseModel):
    """Normalized OpenRouter chat completion response."""

    id: str
    choices: List[ChatChoice]
    usage: UsageStats
