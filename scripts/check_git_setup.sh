#!/usr/bin/env bash
# Quick health check for repository initialization and hygiene.
set -euo pipefail

# Ensure we're in a git repository
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "✅ Git repository initialized"
else
  echo "⚠️ Git repository not initialized"
  echo "  Initialize with: git init"
  exit 1
fi

echo ""
echo "Git status:"
git status --short | head -10

# .gitignore checks
if [[ -f ".gitignore" ]]; then
  echo ""
  echo "✅ .gitignore exists"
  echo "Critical ignore rules:"
  if grep -E "node_modules|\\.env|\\.DS_Store|__pycache__" .gitignore >/dev/null; then
    grep -E "node_modules|\\.env|\\.DS_Store|__pycache__" .gitignore
    echo "✅ Standard patterns ignored"
  else
    echo "⚠️ Missing standard patterns"
    exit 1
  fi
else
  echo "⚠️ .gitignore not found"
  exit 1
fi

echo ""
commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "0")
echo "Total commits: $commit_count"
if [[ "${commit_count}" -lt 1 ]]; then
  echo "⚠️ No commits found"
  exit 1
fi

# Ensure no critical files are tracked
if git ls-files --error-unmatch node_modules >/dev/null 2>&1 || \
   git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "⚠️ Critical files are tracked (node_modules or .env)."
  exit 1
else
  echo "✅ No critical files tracked"
fi
