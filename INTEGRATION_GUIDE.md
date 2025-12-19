# PaperBoi Backend ↔ Mobile Integration Guide

This guide describes how to connect the FastAPI backend and the Expo/React Native mobile app, run integration tests, and validate end-to-end scenarios with both real and mock services.

## 1. Environments & Configuration

- **API base URLs**
  - Production: `https://api.paperboi.app`
  - Local backend: `http://localhost:8000`
  - Mock server (offline/testing): `http://localhost:9000`
- **Expo app config**: `app.json` reads `EXPO_PUBLIC_API_BASE_URL` (or `expo.extra.apiBaseUrl`). Set this for dev/prod builds.
- **Backend CORS**: Configured in `backend/main.py` via `settings.allow_origins`; include your Expo dev tunnels or local IPs.
- **Rate limiting**: Enforced globally by `RateLimitMiddleware` plus per-route guards. Expect `429` when limits are exceeded.
- **Request logging**: Enabled through `RequestContextLogMiddleware`; logs include request IDs and user identifiers.
- **Optional Sentry**: Wire Sentry DSNs through environment variables if centralized error tracking is required.

## 2. Mock Server (for offline & contract testing)

The mock server at `integration/mock_server.py` mirrors the backend REST surface (auth, preferences, news, summaries, email, and bookmark sync).

```bash
python integration/mock_server.py  # Starts on 0.0.0.0:9000
```

Use `{{mock_base_url}}` in the bundled Postman collection (`postman_collection.json`) to toggle between mock and real APIs.

## 3. Test Data & Factories

- Shared factories in `integration/fixtures.py` provision:
  - In-memory SQLite + fakeredis for backend tests.
  - Mock GDELT, summarization, and email services to avoid external calls.
  - Preference and article builders for quick scenario setup.

## 4. Running Integration & E2E Tests

### Backend (FastAPI)

```bash
cd backend
pytest tests/test_integration.py -v
```

The tests exercise:
- User registration/login with JWT issuance.
- Preference updates and retrieval.
- News listing, mock GDELT fetch, and summarization.
- Email summary queuing and history retrieval.
- Offline cache markers and simulated sync queues.

### Mobile (Expo/React Native)

```bash
cd mobile
npm test -- integration.test.tsx
```

Jest tests cover:
- Register/login flows against mocked endpoints.
- Preference synchronization and AsyncStorage persistence.
- News fetch + summary generation.
- Offline queueing via `syncMiddleware` and replay on reconnection.

### End-to-End (manual sanity)

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start mobile: `cd mobile && npx expo start`
3. Optionally start mock server for offline/failure-path testing.
4. Use the Postman collection to validate auth → preferences → news → summary email.

## 5. Verification Procedures

- **CORS**: Confirm Expo dev URL appears in `Access-Control-Allow-Origin`.
- **Rate limits**: Observe `X-RateLimit-Limit` headers; repeated calls should emit `429` and recover after window reset.
- **Monitoring hooks**: Ensure request/response logs emit with request IDs; connect Sentry (if enabled) to capture failures.
- **Data consistency**: After offline actions are replayed, verify preferences and bookmarks match server state and AsyncStorage contents.
- **Email pipeline**: `/api/v1/email/send-summary` should return `status=queued`; `/api/v1/email/history` confirms delivery log.
- **Offline cache**: AsyncStorage entries (`paperboi_bookmarks`, `paperboi_preferences`) should be populated after first successful sync.

## 6. Mocking External Providers

- **GDELT**: `DummyGDELTService` returns deterministic articles; trigger transient failures via `fail_next` in tests.
- **OpenRouter**: Summaries are stubbed by `DummySummarizationService`.
- **Firebase notifications**: `/firebase/notify` in the mock server simply echoes payloads.
- **Email**: `DummyEmailService` records delivery metadata for assertions and history endpoints.

## 7. Troubleshooting

- If pytest cannot import `integration.*`, ensure the repo root is on `PYTHONPATH`.
- Missing dependencies? Install with `pip install -r backend/requirements.txt` and `npm ci` in `mobile/`.
- Expo network errors on device: add your host IP to `settings.allow_origins` and restart the backend.
