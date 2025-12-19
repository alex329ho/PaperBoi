# PaperBoi Deployment Checklist

Use this checklist before promoting the integrated backend/mobile release.

## Configuration & Secrets
- [ ] `EXPO_PUBLIC_API_BASE_URL` set for the target environment and baked into Expo config.
- [ ] Backend environment variables provided: `PAPERBOI_DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, SMTP credentials, optional Sentry DSN.
- [ ] CORS origins include mobile bundle hosts (Expo dev tunnel, production domain, and any staging hosts).
- [ ] Rate limiting thresholds (`api_rate_limit_per_minute`) validated for expected mobile concurrency.

## Infrastructure Readiness
- [ ] Database migrations applied and verified.
- [ ] Redis cache reachable; eviction policy set to avoid token bucket loss.
- [ ] Background workers/schedulers running for email summaries and news ingestion jobs.
- [ ] Monitoring/logging sinks (e.g., CloudWatch/Stackdriver) receiving backend logs.
- [ ] SSL/TLS certificates valid for all public endpoints.

## Application Health
- [ ] `uvicorn main:app` passes `/healthz` and `/api/v1/health` checks.
- [ ] Mock server available for smoke testing fallbacks (`python integration/mock_server.py`).
- [ ] Email delivery tested against provider sandbox with correct sender identities.
- [ ] Push notification keys present if Firebase messaging is enabled.

## Testing
- [ ] Backend integration suite: `pytest tests/test_integration.py -v`.
- [ ] Mobile integration suite: `npm test -- integration.test.tsx`.
- [ ] Manual E2E run: register → login → set preferences → fetch news → summarize → request email summary.
- [ ] Postman collection exercised against staging (`postman_collection.json`).

## Data & Sync
- [ ] Seed data present for onboarding (welcome email template, sample articles if required).
- [ ] Offline queue replay confirmed after toggling airplane mode in the mobile app.
- [ ] Bookmark and preference sync verified across at least two devices.

## Rollout & Recovery
- [ ] Feature flags/toggles documented for risky changes.
- [ ] Rollback plan defined (database backups, container image rollbacks).
- [ ] On-call contact list updated; alert thresholds tuned for latency and error spikes.
