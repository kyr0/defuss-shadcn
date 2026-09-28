#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/push.sh [commit message]
# Non-release push: commits everything on main and pushes it (no version
# bump). GitHub Pages serves docs/ from main.
# Use this for README updates, doc fixes, and other non-release changes;
# releases go through `bun run deploy`.

source "$(dirname "$0")/lib/git-push.sh"

MSG="${1:-chore: update docs}"

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ You must be on main. Currently on: $CURRENT_BRANCH"
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "⚠️  Nothing to commit."
  exit 0
fi

git commit -m "$MSG"
push_ref main

echo "✅ Pushed main (no version bump)."
