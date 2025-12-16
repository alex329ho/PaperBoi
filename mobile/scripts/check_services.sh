#!/usr/bin/env bash
set -euo pipefail

SERVICES_DIR="services"

if [ -d "$SERVICES_DIR" ]; then
  echo "✅ Services directory exists"
  echo "Services found:"
  ls -la "$SERVICES_DIR" | grep -E "\.(js|ts)$" | awk '{print "  - " $NF}'

  service_count=$(find "$SERVICES_DIR" -maxdepth 1 -type f \( -name "*.js" -o -name "*.ts" \) | wc -l)
  if [ "$service_count" -ge 2 ]; then
    echo "✅ At least 2-3 service files present"
  else
    echo "⚠️ Fewer than 2 service files found"
  fi

  api_file=""
  if [ -f "$SERVICES_DIR/api.js" ]; then
    api_file="$SERVICES_DIR/api.js"
  elif [ -f "$SERVICES_DIR/api.ts" ]; then
    api_file="$SERVICES_DIR/api.ts"
  fi

  if [ -n "$api_file" ]; then
    echo
    echo "✅ API client (${api_file##*/}) exists"
    if grep -q "axios\|fetch\|baseURL" "$api_file"; then
      echo "✅ API client has base configuration"
    else
      echo "⚠️ API client may need base URL configuration"
    fi
  else
    echo "⚠️ API client (api.js) not found"
  fi

  if [ -f "$SERVICES_DIR/storage.js" ] || [ -f "$SERVICES_DIR/storage.ts" ]; then
    echo "✅ Storage service exists"
  else
    echo "⚠️ Storage service not found"
  fi

  if [ -f "$SERVICES_DIR/notifications.js" ] || [ -f "$SERVICES_DIR/notifications.ts" ]; then
    echo "✅ Notifications service exists"
  else
    echo "⚠️ Notifications service not found"
  fi
else
  echo "⚠️ Services directory not found"
fi
