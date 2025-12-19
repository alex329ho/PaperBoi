"""Lightweight endpoint checks using the shared integration fixtures."""
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

import pytest
from integration.fixtures import IntegrationApp, PreferencePayload, UserCredentials, auth_headers  # noqa: E402

pytest_plugins = ["integration.fixtures"]


def test_health_endpoint(integration_app: IntegrationApp) -> None:
    response = integration_app.client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_news_list_endpoint(integration_app: IntegrationApp) -> None:
    response = integration_app.client.get("/api/v1/news?limit=3")
    payload = response.json()
    assert response.status_code == 200
    assert payload["success"] is True
    assert "pagination" in payload


def test_preference_roundtrip(integration_app: IntegrationApp) -> None:
    creds = UserCredentials(email="endpoint@example.com", password="Password123!")
    register = integration_app.client.post(
        "/api/v1/auth/register", json={"email": creds.email, "password": creds.password, "name": creds.name}
    )
    assert register.status_code == 201
    login = integration_app.client.post("/api/v1/auth/login", json={"email": creds.email, "password": creds.password})
    token = login.json()["data"]["access_token"]
    headers = auth_headers(token)

    prefs = PreferencePayload(topics=["ai"], regions=["US"], languages=["en"])
    update = integration_app.client.put("/api/v1/preferences", json=prefs.as_dict(), headers=headers)
    assert update.status_code == 200
    fetched = integration_app.client.get("/api/v1/preferences", headers=headers)
    assert fetched.status_code == 200
    assert "ai" in fetched.json()["data"]["topics"]
