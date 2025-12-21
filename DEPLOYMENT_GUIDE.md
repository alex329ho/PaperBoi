# PaperBoi Deployment Guide

This guide covers local Docker, Heroku, and AWS Lambda deployments for the PaperBoi FastAPI backend.

## Prerequisites

- Docker + Docker Compose
- Python 3.11 (for local tooling)
- Postgres 14+ (for non-Docker deployments)
- AWS CLI + Serverless Framework (for Lambda)
- Heroku CLI (for Heroku)

## Environment Configuration

The backend uses `PAPERBOI_`-prefixed environment variables (see `backend/config.py`).

Key variables:

- `PAPERBOI_ENVIRONMENT` (development/testing/production)
- `PAPERBOI_DATABASE_URL` (async driver required, e.g. `postgresql+asyncpg://...`)
- `PAPERBOI_REDIS_URL`
- `PAPERBOI_JWT_SECRET_KEY`
- `PAPERBOI_GDELT_API_URL` (optional; override GDELT DOC endpoint for mocks)
- `PAPERBOI_GDELT_API_KEY` (optional; GDELT DOC API does not require a key)
- `PAPERBOI_CORS_ORIGINS` (comma-separated)

Local Docker uses `backend/.env.docker`. For production, set the same variables in your cloud provider.

## Docker (Local Development)

### Build

```bash
docker build -t paperboi-backend:latest -f backend/Dockerfile backend/
```

### Run with Docker Compose

```bash
docker-compose up -d
```

### Verify

```bash
docker-compose ps
```

API should be available at `http://localhost:8000/healthz`.

## Database Initialization & Migrations

Initial Postgres bootstrap uses `backend/db/init_db.sql` (mounted by Docker Compose).

Alembic migrations live under `database/migrations/`.

Generate a migration:

```bash
alembic -c database/migrations/alembic.ini revision --autogenerate -m "init"
```

Apply migrations:

```bash
alembic -c database/migrations/alembic.ini upgrade head
```

## Heroku Deployment

1. Create the app:

```bash
heroku create paperboi-backend
```

2. Set configuration values:

```bash
heroku config:set \
  PAPERBOI_ENVIRONMENT=production \
  PAPERBOI_DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DB \
  PAPERBOI_REDIS_URL=redis://USER:PASSWORD@HOST:PORT/0 \
  PAPERBOI_JWT_SECRET_KEY=replace-me \
  # PAPERBOI_GDELT_API_KEY=replace-me (optional; GDELT DOC API does not require a key)
```

3. Add a database (optional if using Heroku Postgres):

```bash
heroku addons:create heroku-postgresql:mini
```

4. Deploy:

```bash
git push heroku main
```

5. Run migrations:

```bash
heroku run alembic -c database/migrations/alembic.ini upgrade head
```

Heroku uses the `Procfile` in the repository root.

## AWS Lambda (Serverless Framework)

### Install tooling

```bash
npm install -g serverless
```

Install the Python requirements plugin once per project:

```bash
serverless plugin install -n serverless-python-requirements
```

### Configure secrets in SSM Parameter Store

Store values under `/paperboi/<stage>/...`:

- `/paperboi/dev/database_url`
- `/paperboi/dev/jwt_secret_key`
- `/paperboi/dev/gdelt_api_key`
- `/paperboi/dev/redis_url` (optional)

### Deploy

```bash
serverless deploy --stage dev
```

### Notes

- Lambda handler: `backend/lambda_handler.handler`.
- The Serverless config uses `serverless-python-requirements` to package dependencies.
- Ensure `mangum` is included in `backend/requirements.txt` for ASGI support.

## Secrets Management

- **Heroku**: `heroku config:set` and `heroku config`.
- **AWS**: Systems Manager Parameter Store (recommended) or Secrets Manager.
- **Docker**: `backend/.env.docker` for local use only. Do not commit production secrets.

## Monitoring & Alerting

Prometheus-style alert rules are in `monitoring/alerts.yml`. Adjust labels to match your metrics pipeline.

## Troubleshooting

- Ensure `PAPERBOI_DATABASE_URL` uses an async driver (e.g. `postgresql+asyncpg`).
- If CORS fails, set `PAPERBOI_CORS_ORIGINS` with comma-separated origins.
- For Lambda timeouts, increase `timeout` in `serverless.yml` or optimize DB queries.
