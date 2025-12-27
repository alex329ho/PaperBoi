#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-${EXPO_PUBLIC_API_BASE_URL:-}}"

if [[ -z "${API_BASE_URL}" ]]; then
  echo "Set API_BASE_URL (or EXPO_PUBLIC_API_BASE_URL) to your deployed API Gateway base URL."
  echo "Example: API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev"
  exit 1
fi

BASE_URL="${API_BASE_URL%/}"

echo "GET ${BASE_URL}/articles"
curl -sS -H 'Accept: application/json' "${BASE_URL}/articles"
echo
echo

echo "POST ${BASE_URL}/articles"
curl -sS -H 'Content-Type: application/json' \
  -X POST \
  -d '{"title":"Smoke Test","summary":"Hello from the local script.","url":"https://example.com"}' \
  "${BASE_URL}/articles"
echo
