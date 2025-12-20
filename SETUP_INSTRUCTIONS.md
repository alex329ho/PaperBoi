# PaperBoi Setup Guide

This guide explains how to bootstrap the PaperBoi stack (FastAPI backend + Expo mobile app) on macOS, Linux, and Windows. All commands assume repository root.

## Prerequisites
- Python 3.12+ (recommended; some dependencies do not yet support Python 3.14)
- Node.js 18+
- npm (bundled with Node.js)
- Docker & docker-compose
- Git

## Directory Overview
- `backend/`: FastAPI app, database scripts, environment templates
- `mobile/`: Expo (React Native) mobile client
- `scripts/`: Utility scripts (verification, etc.)

## 1) Automated Setup
### macOS/Linux
```bash
chmod +x setup.sh
./setup.sh
```

### Windows (Command Prompt)
```bat
setup_windows.bat
```

The scripts will:
1. Validate required CLI tools.
2. Create a Python virtual environment and install backend dependencies.
3. Install mobile dependencies with npm.
4. Copy `.env.example` files when actual `.env` files are missing.
5. Start PostgreSQL and Redis via Docker.

## 2) Manual Setup
1. **Clone repo**
   ```bash
   git clone https://github.com/your-org/PaperBoi.git
   cd PaperBoi
   ```
2. **Python venv + deps**
   ```bash
   python3.12 -m venv backend/.venv
   source backend/.venv/bin/activate
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```
3. **Mobile deps**
   ```bash
   cd mobile
   npm install --legacy-peer-deps
   cd ..
   ```
4. **Environment files**
   ```bash
   cp backend/.env.example backend/.env
   cp mobile/.env.example mobile/.env
   ```
5. **Docker services**
   ```bash
   docker-compose up -d db cache
   ```
6. **Run backend**
   ```bash
   source backend/.venv/bin/activate
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
7. **Run mobile app**
   ```bash
   cd mobile
   npm start
   ```

## 3) Environment Variables
- Backend vars defined in `backend/.env.example` (JWT, DB, Redis, external APIs, scheduler).
- Mobile vars defined in `mobile/.env.example` (API base URL, OpenRouter, Firebase keys).

## 4) Docker Usage
- Build and start everything: `docker-compose up --build`
- Stop services: `docker-compose down`
- Logs: `docker-compose logs -f api db cache`

## 5) Database Initialization
The `backend/db/init_db.sql` file seeds the schema automatically when the Postgres container starts. Customize this file for migrations or run via `psql` in the db container if needed.

## 6) Verification
Run the automated verifier:
```bash
./scripts/verify_setup.sh
```
Then open `verification_checklist.md` to manually confirm.

## 7) Production Notes
- Set strong `SECRET_KEY` and unique DB/Redis credentials.
- Disable debug (`DEBUG=false`) and set `ENVIRONMENT=production`.
- Consider reverse proxy (e.g., Nginx) with HTTPS termination.
- Configure a production-ready process manager (e.g., systemd, Kubernetes) to run `uvicorn` without `--reload`.
- Securely store Firebase private keys and OpenRouter tokens.

## 8) Formatting & Standards
- Python: PEP 8 (enforced via editor/CI).
- JavaScript/TypeScript: Prettier + ESLint.

## 9) Health Checks
- Liveness: `GET /healthz`
- Readiness: `GET /ready`

## 10) Support
If issues arise, ensure Docker is running and ports 5432/6379/8000 are free. Check logs with `docker-compose logs -f`.
