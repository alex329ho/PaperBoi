"""JWT authentication middleware for optional request context population."""
from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from backend.dependencies import decode_token
from backend.utils.logger import get_logger

logger = get_logger(__name__)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Decode bearer tokens when present and attach claims to the request state."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:  # type: ignore[override]
        authorization = request.headers.get("Authorization")
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", maxsplit=1)[1]
            try:
                payload = decode_token(token)
                request.state.token_payload = payload
            except Exception:
                logger.warning("Ignoring invalid token on optional middleware", extra={"path": request.url.path})
        return await call_next(request)

__all__ = ["JWTAuthMiddleware"]
