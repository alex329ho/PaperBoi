# CI/CD Guide

This project uses GitHub Actions to test, build, and deploy the PaperBoi backend and mobile app.

## Workflows

- `./.github/workflows/backend-test.yml`
  - Runs pylint/black, pytest, and coverage reporting.
- `./.github/workflows/backend-deploy.yml`
  - Builds a Docker image and deploys to Heroku on tag pushes (e.g. `v1.2.3`).
  - Runs a smoke test after deployment.
- `./.github/workflows/mobile-test.yml`
  - Runs ESLint, Prettier checks, Jest unit tests, and E2E tests for the mobile app.
- `./.github/workflows/mobile-build.yml`
  - Builds Android and iOS artifacts via EAS on pushes to `main` or manual dispatch.
- `./.github/workflows/mobile-deploy.yml`
  - Submits Android and iOS builds to Google Play Beta/TestFlight on tag pushes.

## Required GitHub Secrets

Backend:
- `HEROKU_API_KEY` (Heroku API key)
- `HEROKU_APP_NAME` (target Heroku app name)
- `HEROKU_EMAIL` (Heroku account email)
- `SMOKE_TEST_URL` (full URL to a health or status endpoint)

Mobile (Expo/EAS):
- `EXPO_TOKEN` (Expo access token)

Google Play:
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` (JSON service account key for Play Console)

App Store Connect:
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY`

## Backend Notes

- Linting uses `black --check` and `pylint backend --ignore=venv`.
- Coverage is generated with `pytest --cov` and uploaded as `coverage.xml`.
- Ensure your Heroku app is configured to use Docker builds.
- Set `SMOKE_TEST_URL` to a stable endpoint (for example, `/health`).

## Mobile Notes

- The workflows use EAS for building and submitting.
- Ensure `mobile/eas.json` is configured for `production` build profiles.
- E2E tests expect a `test:e2e` script in `mobile/package.json`. Add one if you do not already have E2E tooling configured.

## How to Trigger Deploys

- Backend deploy: push a git tag starting with `v` (example: `v1.2.3`).
- Mobile deploy: push a git tag starting with `v` (example: `v1.2.3`).

## Local Verification

Backend:
- `cd backend`
- `black --check .`
- `pylint . --ignore=venv`
- `pytest --cov=backend --cov-report=term`

Mobile:
- `cd mobile`
- `npm run lint`
- `npx prettier --check .`
- `npm test -- --ci`
- `npm run test:e2e`
