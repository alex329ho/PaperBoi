#!/usr/bin/env bash
# Automated setup script for PaperBoi on macOS/Linux.
# Installs dependencies, sets up virtual environments, and prepares local services.

set -euo pipefail

PYTHON_VERSION_REQUIRED="3.11"
NODE_VERSION_REQUIRED="18"

command -v python3 >/dev/null 2>&1 || { echo "Python3 is required."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "docker-compose is required."; exit 1; }

python3 - <<PY
import sys
required = tuple(map(int, "${PYTHON_VERSION_REQUIRED}".split('.')))
if sys.version_info < required:
    sys.exit(f"Python {required} or higher is required. Found {sys.version_info.major}.{sys.version_info.minor}")
PY

NODE_VER=$(node -v | sed 's/v//')
NODE_MAJOR=${NODE_VER%%.*}
if [ "$NODE_MAJOR" -lt "$NODE_VERSION_REQUIRED" ]; then
  echo "Node.js $NODE_VERSION_REQUIRED+ is required. Found $NODE_VER"
  exit 1
fi

# Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Install mobile dependencies
cd mobile
npm install --legacy-peer-deps
cd ..

# Copy env examples if not present
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f mobile/.env ] || cp mobile/.env.example mobile/.env

# Launch containers
docker-compose up -d db cache

cat <<'MSG'
Setup complete!
- Activate backend venv: source .venv/bin/activate
- Start API locally: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
- Start Expo app: cd mobile && npm start
MSG
