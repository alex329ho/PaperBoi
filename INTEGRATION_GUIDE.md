# PaperBoi Integration Guide

This guide explains how to run integration and end-to-end tests connecting the PaperBoi backend (FastAPI) and mobile app (React Native + Expo). It includes mock server usage, verification steps, and recommended configuration for testing and deployment.

## Goals
- Validate end-to-end flows: register/login, preferences, news fetch, summarize, bookmarking, and email summaries.
- Support offline/online transition tests and queued sync replay.
- Provide a lightweight mock server for deterministic testing and mobile QA.

## Components
- Backend: `backend/main.py` (FastAPI)
- Mock API: `integration/mock_server.py` (FastAPI mock server)
- Integration fixtures & scenarios: `integration/fixtures.py`, `integration/test_scenarios.py`
- Backend integration tests: `backend/tests/test_integration.py`
- Mobile integration tests: `mobile/__tests__/integration.test.tsx`
- Postman collection: `postman_collection.json`

---

## Prerequisites
- Python 3.10+ (use venv)
- Node 16+ / npm or Yarn
- `pip install -r backend/requirements.txt`
- In the mobile folder: `npm install` (or `yarn`)

## Environment & Configuration

Backend (recommended env vars):
- `PAPERBOI_DATABASE_URL` - database URL (integration tests use in-memory SQLite)
- `REDIS_URL` - Redis endpoint (tests use fakeredis)
- `OPENROUTER_API_KEY` - if running real summarization service (optional)
- `SENTRY_DSN` - optional error tracking (set in production)

Mobile (configurable in app code):
- `API_BASE_URL` - base URL for API requests (dev: `http://localhost:9000` for mock, or `http://<machine-ip>:8000` for local backend`)
- `REQUEST_TIMEOUT_MS` - per-request timeout
- `RETRY_ATTEMPTS` - number of retry attempts for transient failures
- Offline queue: uses `AsyncStorage` for queued actions

Note: When running mobile + backend on the same machine, use your host IP (not `localhost`) for the Expo app on a real device. For simulators, `localhost` often works.

---

## Mock Server

Location: `integration/mock_server.py`

Start it with:

```bash
# run from repo root
python -m integration.mock_server
```

Default mock server port: `9000`.

Mock endpoints mirror the production API surface used in tests, including:
- `/api/v1/auth/register`, `/api/v1/auth/login`
- `/api/v1/preferences` (GET/PUT)
- `/api/v1/news`, `/api/v1/news/search`, `/api/v1/news/fetch-fresh`
- `/api/v1/news/{id}/summarize` (mocked summarization)
- `/api/v1/bookmarks`, `/api/v1/email/send-summary`
- `/openrouter/v1/chat/completions` (mocked)
- `/firebase/notify` (mocked)

The mock server supports a `/mock/fail-next` route to simulate transient upstream failures for resilience testing.

---

## Running Integration Tests (Backend)

1. Start mock server (optional; tests use in-memory fixtures but QA may use mock server):

```bash
python -m integration.mock_server
```

2. Start the local backend (if testing against the real backend):

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. Run pytest integration suite:

```bash
cd backend
pytest tests/test_integration.py -q
```

Notes:
- The integration fixtures (`integration/fixtures.py`) create an in-memory SQLite DB and fakeredis, and override dependencies so tests are hermetic by default.
- To run tests against the real backend endpoints, unset the pytest plugin `integration.fixtures` and set environment variables to point at the running services.

---

## Running Mobile Integration Tests

Mobile tests are implemented with Jest and run in Node (they mock `fetch` and `AsyncStorage`).

From the `mobile` folder:

```bash
npm test -- __tests__/integration.test.tsx
```

To run the Expo app against the mock server for manual QA:

```bash
cd mobile
npx expo start
# set API_BASE_URL to http://<host-ip>:9000 in app config or env
```

---

## Test Scenarios (Implemented)

- Scenario 1: User Registration and First Use
  - Register via `/auth/register`
  - Login → obtain token
  - Update preferences → GET preferences
  - Fetch news → summarize an article → send summary email

- Scenario 2: News Fetching and Filtering
  - Update preferences with topics/regions
  - Trigger `/news/fetch-fresh` (calls mocked GDELT)
  - Search/filter news feed
  - Simulate transient upstream failure via `/mock/fail-next`

- Scenario 3: Offline Usage
  - Cache news in `AsyncStorage` or fakeredis
  - Toggle network to offline (mobile test uses slice `ui.network`)
  - Queue bookmark changes locally
  - Toggle network back to online → replay queued actions

- Scenario 4: Email Summary
  - Enable email summaries in preferences
  - Ensure scheduled job generates summary and posts to `/api/v1/email/send-summary`

---

## Mocking External Services

- GDELT: `integration/fixtures.DummyGDELTService` and `/news/fetch-fresh` in mock server.
- OpenRouter (summarization): `integration/fixtures.DummySummarizationService` and mock endpoint `/openrouter/v1/chat/completions`.
- Firebase notifications: `/firebase/notify` in mock server.
- SMTP/email: `integration/fixtures.DummyEmailService` captures deliveries.

---

## Verification Checklist (Quick)

- Backend integration tests pass: `pytest tests/test_integration.py` ✅
- Mobile integration Jest tests pass: `cd mobile && npm test` ✅
- Mock server responds to health check: `curl http://localhost:9000/mock/health` ✅
- Email queue captured in fixtures when sending summary ✅
- Offline queue replay validated in mobile tests ✅

---

## Deployment Checklist (Integration-specific)

- Ensure CORS includes mobile origins (or set via env)
- Configure rate-limiting with sensible defaults for mobile clients
- Enable request logging and structured traces
- Configure Sentry (optional) for pre-production
- Ensure `OPENROUTER_API_KEY` and SMTP credentials are in secret store

---

## Troubleshooting

- If tests fail due to DB/migrations, run `backend/db/init_db.sql` or point to a fresh DB.
- For mobile connectivity on a device, use host IP and confirm firewall ports open.

---

If you'd like, I can also add a GitHub Actions workflow to run integration tests on push/pull requests.
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
