"""Cross-platform integration tests bridging the backend and mobile flows."""
from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Dict

import asyncio

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from integration.fixtures import (  # noqa: E402
    IntegrationApp,
    PreferencePayload,
    UserCredentials,
    article_payload,
    auth_headers,
)


def _register_and_login(app_ctx: IntegrationApp, credentials: UserCredentials) -> Dict[str, str]:
    register = app_ctx.client.post(
        "/api/v1/auth/register", json={"email": credentials.email, "password": credentials.password, "name": credentials.name}
    )
    assert register.status_code == 201

    login = app_ctx.client.post("/api/v1/auth/login", json={"email": credentials.email, "password": credentials.password})
    assert login.status_code == 200
    tokens = login.json()["data"]
    return tokens


def test_user_registration_and_first_use_flow(integration_app: IntegrationApp) -> None:
    """Scenario 1: new account, preference setup, and first summary email."""

    creds = UserCredentials(email="newuser@example.com", password="P@perBoi123")
    tokens = _register_and_login(integration_app, creds)
    headers = auth_headers(tokens["access_token"])

    preference_payload = PreferencePayload(
        topics=["technology", "ai"],
        regions=["US"],
        languages=["en"],
        notification_enabled=True,
        notification_time="07:30",
        summary_length="SHORT",
        email_frequency="daily",
    )
    update = integration_app.client.put("/api/v1/preferences", json=preference_payload.as_dict(), headers=headers)
    assert update.status_code == 200
    prefs = integration_app.client.get("/api/v1/preferences", headers=headers)
    assert prefs.status_code == 200
    assert set(prefs.json()["data"]["topics"]) == {"technology", "ai"}

    news = integration_app.client.get("/api/v1/news?limit=5")
    assert news.status_code == 200
    first_article = news.json()["data"][0]

    summary = integration_app.client.post(f"/api/v1/news/{first_article['id']}/summarize", json={"length": "SHORT"})
    assert summary.status_code == 200
    assert "summary_text" in summary.json()["data"]

    email_resp = integration_app.client.post(
        "/api/v1/email/send-summary",
        json={"recipients": [creds.email], "topics": preference_payload.topics, "include_count": 3},
    )
    assert email_resp.status_code == 200
    assert email_resp.json()["data"]["status"] == "queued"
    assert len(integration_app.email_service.delivery_log) == 1


def test_news_fetching_filtering_and_error_recovery(integration_app: IntegrationApp) -> None:
    """Scenario 2 and error handling: preferences drive news filters, plus retryable failures."""

    integration_app.gdelt_service.responses = [
        article_payload(title="AI transforms healthcare", url="https://example.com/ai-health"),
        article_payload(title="Regional policy update", url="https://example.com/region", location="EU"),
    ]
    fetch = integration_app.client.post(
        "/api/v1/news/fetch-fresh",
        json={"query": "ai", "timespan": "2hours", "region": "US"},
    )
    assert fetch.status_code == 202
    assert len(fetch.json()["data"]) == 2
    assert integration_app.gdelt_service.calls[-1] == ("ai", "US")

    search = integration_app.client.post("/api/v1/news/search", json={"query": "ai", "regions": ["US"]})
    assert search.status_code == 200
    assert any("ai" in article["title"].lower() for article in search.json()["data"])

    # Force a transient failure then confirm the subsequent request succeeds
    integration_app.gdelt_service.fail_next = True
    failed = integration_app.client.post("/api/v1/news/fetch-fresh", json={"query": "ai"})
    assert failed.status_code >= 500
    fetch_recovered = integration_app.client.post("/api/v1/news/fetch-fresh", json={"query": "ai"})
    assert fetch_recovered.status_code == 202


def test_offline_to_online_transition_and_data_consistency(integration_app: IntegrationApp) -> None:
    """Scenario 3 and 4: cache usage while offline and sync when connectivity resumes."""

    creds = UserCredentials(email="offline@example.com", password="Offline123!")
    tokens = _register_and_login(integration_app, creds)
    headers = auth_headers(tokens["access_token"])

    # Seed cached news in redis to simulate offline viewing
    cached_payload = {"articles": integration_app.gdelt_service.responses}
    loop = asyncio.get_event_loop()
    loop.run_until_complete(integration_app.redis.set("gdelt:cache:offline", json.dumps(cached_payload)))
    offline_news = integration_app.client.get("/api/v1/news")
    assert offline_news.status_code == 200
    assert offline_news.json()["pagination"]["total"] >= 1

    # Queue a bookmark while "offline" then verify it syncs once online
    loop.run_until_complete(integration_app.redis.rpush("bookmarks:queued", "article-1"))
    loop.run_until_complete(integration_app.redis.rpush("bookmarks:queued", "article-2"))
    queued = loop.run_until_complete(integration_app.redis.lrange("bookmarks:queued", 0, -1))
    assert len(queued) == 2

    # Simulate sync by flushing the queue into preferences update (acts as a write)
    preference_payload = PreferencePayload(topics=["sync"], regions=["US"], languages=["en"])
    pref_update = integration_app.client.put("/api/v1/preferences", json=preference_payload.as_dict(), headers=headers)
    assert pref_update.status_code == 200
    loop.run_until_complete(integration_app.redis.delete("bookmarks:queued"))

    # Email summaries continue to work after reconnection
    send_summary = integration_app.client.post(
        "/api/v1/email/send-summary",
        json={"recipients": [creds.email], "topics": ["sync"], "include_count": 1},
    )
    assert send_summary.status_code == 200
    history = integration_app.client.get("/api/v1/email/history")
    assert history.status_code == 200
    assert history.json()["success"] is True
