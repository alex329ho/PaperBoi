#!/usr/bin/env bash
# Verify that core dependencies and services for PaperBoi are running.
set -euo pipefail

command -v python3 >/dev/null || { echo "Python missing"; exit 1; }
command -v node >/dev/null || { echo "Node missing"; exit 1; }
command -v docker >/dev/null || { echo "Docker missing"; exit 1; }

python3 - <<'PY'
import importlib
modules = ["fastapi", "uvicorn", "sqlalchemy", "redis"]
for module in modules:
    try:
        importlib.import_module(module)
        print(f"OK: {module} installed")
    except ImportError:
        raise SystemExit(f"Missing Python dependency: {module}")
PY

# Check docker services
if ! docker ps --format '{{.Names}}' | grep -q 'paperboi_db'; then
  echo "PostgreSQL container not running. Start with: docker-compose up -d"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q 'paperboi_cache'; then
  echo "Redis container not running. Start with: docker-compose up -d"
  exit 1
fi

echo "Environment verification succeeded."
