"""Local mock server for exercising the PaperBoi mobile app end-to-end.

The mock API emulates the backend surface area required by integration and
offline-first tests without talking to external services (GDELT, OpenRouter,
Firebase, SMTP). It can be launched alongside the real backend to validate
mobile network clients, retry logic, and synchronization flows.
"""
from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from integration.fixtures import PreferencePayload, UserCredentials, article_payload  # noqa: E402

logger = logging.getLogger("paperboi.mock_server")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PaperBoi Mock API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class MockState:
    """Track mock state across requests."""

    users: Dict[str, UserCredentials] = field(default_factory=dict)
    tokens: Dict[str, str] = field(default_factory=dict)
    preferences: Dict[str, PreferencePayload] = field(default_factory=dict)
    bookmarks: Dict[str, List[str]] = field(default_factory=dict)
    news: List[Dict[str, Any]] = field(default_factory=lambda: [article_payload()])
    emails: List[Dict[str, Any]] = field(default_factory=list)
    should_fail_next: bool = False


STATE = MockState()


class AuthRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class BookmarkPayload(BaseModel):
    article_id: str


class EmailRequest(BaseModel):
    recipients: list[str]
    topics: list[str] = []
    include_count: int = 5


def _build_token(email: str) -> str:
    token = f"mock-{abs(hash(email))}"
    STATE.tokens[token] = email
    return token


def _get_email_from_token(token: str | None) -> str:
    if not token or token not in STATE.tokens:
        raise HTTPException(status_code=401, detail="unauthorized")
    return STATE.tokens[token]


@app.post("/api/v1/auth/register")
def register(payload: AuthRequest):
    if payload.email in STATE.users:
        raise HTTPException(status_code=400, detail="duplicate")
    STATE.users[payload.email] = UserCredentials(email=payload.email, password=payload.password, name=payload.name or "Mock User")
    logger.info("Registered mock user %s", payload.email)
    return {"success": True, "data": {"email": payload.email, "name": payload.name or "Mock User"}}


@app.post("/api/v1/auth/login")
def login(payload: AuthRequest):
    if payload.email not in STATE.users or STATE.users[payload.email].password != payload.password:
        raise HTTPException(status_code=401, detail="invalid credentials")
    return {"success": True, "data": {"access_token": _build_token(payload.email), "refresh_token": _build_token(payload.email)}}


@app.get("/api/v1/preferences")
def get_preferences(authorization: str | None = None):
    email = _get_email_from_token(authorization.replace("Bearer ", "") if authorization else None)
    prefs = STATE.preferences.get(email, PreferencePayload(topics=[], regions=[], languages=[]))
    return {"success": True, "data": prefs.as_dict()}


@app.put("/api/v1/preferences")
def update_preferences(payload: Dict[str, Any] = Body(default_factory=dict), authorization: str | None = None):
    email = _get_email_from_token(authorization.replace("Bearer ", "") if authorization else None)
    prefs = PreferencePayload(
        topics=payload.get("topics", []),
        regions=payload.get("regions", []),
        languages=payload.get("languages", []),
        notification_enabled=payload.get("notification_enabled", True),
        notification_time=payload.get("notification_time", "08:00"),
        summary_length=payload.get("summary_length", "MEDIUM"),
        email_frequency=payload.get("email_frequency", "daily"),
    )
    STATE.preferences[email] = prefs
    return {"success": True, "data": prefs.as_dict(), "message": "Preferences updated"}


@app.get("/api/v1/news")
def list_news(topic: str | None = None):
    payload = STATE.news
    if topic:
        payload = [item for item in STATE.news if topic.lower() in item["title"].lower()]
    return {"success": True, "data": payload, "pagination": {"total": len(payload)}}


@app.post("/api/v1/news/search")
def search_news(payload: Dict[str, Any] = Body(default_factory=dict)):
    query = payload.get("query", "")
    results = [article for article in STATE.news if query.lower() in article["title"].lower()]
    return {"success": True, "data": results}


@app.post("/api/v1/news/fetch-fresh")
def fetch_fresh(payload: Dict[str, Any] = Body(default_factory=dict)):
    if STATE.should_fail_next:
        STATE.should_fail_next = False
        raise HTTPException(status_code=503, detail="transient")
    new_article = article_payload(
        title=f"{payload.get('query', 'Tech')} headline {len(STATE.news)+1}",
        url=f"https://mock.paperboi.test/article-{len(STATE.news)+1}",
    )
    STATE.news.append(new_article)
    return {"success": True, "data": [new_article], "message": "Fresh fetch triggered"}


@app.post("/api/v1/email/send-summary")
def send_summary(request: EmailRequest, authorization: str | None = None):
    _get_email_from_token(authorization.replace("Bearer ", "") if authorization else None)
    record = {
        "id": f"email-{len(STATE.emails)+1}",
        "recipients": request.recipients,
        "topics": request.topics,
        "include_count": request.include_count,
        "status": "queued",
    }
    STATE.emails.append(record)
    return {"success": True, "data": record}


@app.post("/api/v1/bookmarks")
def add_bookmark(payload: BookmarkPayload, authorization: str | None = None):
    email = _get_email_from_token(authorization.replace("Bearer ", "") if authorization else None)
    STATE.bookmarks.setdefault(email, [])
    STATE.bookmarks[email].append(payload.article_id)
    return {"success": True, "data": {"bookmarks": STATE.bookmarks[email]}}


@app.get("/api/v1/bookmarks")
def list_bookmarks(authorization: str | None = None):
    email = _get_email_from_token(authorization.replace("Bearer ", "") if authorization else None)
    return {"success": True, "data": STATE.bookmarks.get(email, [])}


@app.post("/mock/fail-next")
def fail_next():
    STATE.should_fail_next = True
    return {"success": True, "message": "The next fetch-fresh call will fail with 503"}


@app.get("/mock/health")
def health():
    return {"status": "ok", "news_count": len(STATE.news)}


@app.get("/openrouter/v1/chat/completions")
def openrouter_mock():
    return {"choices": [{"message": {"content": "Mock summary"}}]}


@app.post("/firebase/notify")
def firebase_mock(payload: Dict[str, Any] = Body(default_factory=dict)):
    return {"success": True, "data": payload}


@app.post("/email/status")
def email_status():
    return {"success": True, "queued": len(STATE.emails)}


if __name__ == "__main__":
    import uvicorn

    # Derive a port from the filename suffix if present (e.g. mock_server_9001.py).
    # If the filename doesn't end with a numeric suffix, fall back to 9000.
    try:
        stem = Path(__file__).stem
        if "_" in stem:
            candidate = stem.split("_")[-1]
            port = int(candidate)
        else:
            port = 9000
    except Exception:
        port = 9000
    logger.info("Starting PaperBoi mock server on 0.0.0.0:%s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)
