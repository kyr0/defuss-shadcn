#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [patch|minor|major] [alpha|beta|rc|release]
# Default: patch, preserving current prerelease suffix
#
# Examples:
#   ./scripts/deploy.sh              → 0.3.0-alpha  → 0.3.1-alpha  (patch bump, keep suffix)
#   ./scripts/deploy.sh minor        → 0.3.1-alpha  → 0.4.0-alpha  (minor bump, keep suffix)
#   ./scripts/deploy.sh patch beta   → 0.4.0-alpha  → 0.4.1-beta   (patch bump, change to beta)
#   ./scripts/deploy.sh patch release→ 0.4.1-beta   → 0.4.2        (patch bump, drop suffix)
#
# This is a RELEASE deploy. It:
#   1. Bumps the version in package.json (the docs header badge is stamped
#      from it at docs build time — no second version literal exists)
#   2. Generates a changelog entry from git commits (all messages since the
#      last release)
#   3. Commits to dev, then a SECOND commit embeds that commit's short hash
#      into the changelog entry (verify's "changelog ↔ version" two-commit rule)
#   4. Pushes dev, merges dev → main and pushes
#   5. Creates a git tag
#
# For non-release changes (README, doc fixes, etc.), use:
#   bun run push

BUMP_TYPE="${1:-patch}"
PHASE="${2:-}"  # alpha, beta, rc, release, or empty (keep current)

# Ensure we're on dev
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "dev" ]]; then
  echo "❌ You must be on the dev branch to deploy. Currently on: $CURRENT_BRANCH"
  exit 1
fi

# Ensure working tree is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Working tree is dirty. Commit or stash changes first."
  exit 1
fi

# Read current version from package.json (may include prerelease suffix like -alpha)
FULL_VERSION=$(node -p "require('./package.json').version")

# Split into base version and prerelease suffix
BASE_VERSION=$(echo "$FULL_VERSION" | sed 's/-.*//')
CURRENT_SUFFIX=$(echo "$FULL_VERSION" | grep -o '\-.*' || true)

# Compute new base version
IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE_VERSION"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "❌ Invalid bump type: $BUMP_TYPE (use patch, minor, or major)"; exit 1 ;;
esac
NEW_BASE="${MAJOR}.${MINOR}.${PATCH}"

# Determine prerelease suffix for new version
if [[ "$PHASE" == "release" ]]; then
  NEW_SUFFIX=""
elif [[ -n "$PHASE" ]]; then
  NEW_SUFFIX="-${PHASE}"
else
  NEW_SUFFIX="$CURRENT_SUFFIX"  # keep current suffix
fi

NEW_VERSION="${NEW_BASE}${NEW_SUFFIX}"

echo "📦 Bumping version: v${FULL_VERSION} → v${NEW_VERSION} (${BUMP_TYPE}${PHASE:+, phase: $PHASE})"

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✅ Updated version in package.json (docs header badge is stamped from it at build time)"

# Generate changelog entry from git commits since last tag.
# Two-commit rule (verify's "changelog ↔ version" gate): the entry goes into
# src/documentation/data/changelog.json with the version bump, then a SECOND
# commit stamps this commit's short hash into the entry — proof of when the
# entry was authored.
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
DATE=$(date +"%B %d, %Y")

# Collect commit messages (skip merge commits and version bumps)
if [[ -n "$LAST_TAG" ]]; then
  COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s" --no-merges | grep -v "^chore: bump version" || true)
else
  COMMITS=$(git log --pretty=format:"%s" --no-merges | grep -v "^chore: bump version" || true)
fi

# Dedupe, then write the entry as JSON (scripts/changelog-entry.ts escapes
# markup and prepends the entry)
mapfile -t COMMIT_LINES <<< "$(echo "$COMMITS" | awk '!seen[$0]++' | grep . || true)"
if [[ ${#COMMIT_LINES[@]} -eq 0 ]]; then
  COMMIT_LINES=()
fi
bun scripts/changelog-entry.ts add "${NEW_VERSION}" "${DATE}" "${COMMIT_LINES[@]}"

echo "✅ Added changelog entry for v${NEW_VERSION}"

# Regenerate everything from the bumped sources — compile, screenshots (layout.ts
# is a screenshot input), docs mirror, verify, tests, e2e (same gates as CI).
make build

# Two-commit rule (verify's "changelog ↔ version" gate): first commit the
# changelog entry WHILE the old version is still in package.json (so every
# commit on dev stays verify-green), then a second commit stamps that commit's
# short hash into the entry and lands the version bump.
git add src/documentation/data/changelog.json dist/documentation/changelog.html docs/changelog.html
git commit -m "docs(changelog): add v${NEW_VERSION} entry"
ENTRY_HASH=$(git rev-parse --short HEAD)

# Stamp the entry-authoring commit hash into the entry and rebuild the
# generated trees for the bump commit.
bun scripts/changelog-entry.ts stamp-hash "${NEW_VERSION}" "${ENTRY_HASH}"
bun scripts/build.ts && bun scripts/minify.ts && bun run build:docs && bun scripts/sync-docs.ts

git add package.json src/documentation/data/changelog.json dist/ docs/
git commit -m "chore: bump version to v${NEW_VERSION} (changelog ${ENTRY_HASH})"
git push origin dev

# Merge into main and push
git checkout main
git merge dev -m "release: v${NEW_VERSION}"
git push origin main

# Tag the release
git tag "v${NEW_VERSION}"
git push origin "v${NEW_VERSION}"

# Create GitHub Release from commit log
RELEASE_NOTES=$(echo "$COMMITS" | sed 's/^/- /')
if [[ -z "$RELEASE_NOTES" ]]; then
  RELEASE_NOTES="- Maintenance release"
fi

if command -v gh &> /dev/null; then
  gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes "$RELEASE_NOTES" \
    --target main
  echo "✅ Created GitHub Release for v${NEW_VERSION}"
else
  echo "⚠️  gh CLI not found — skipping GitHub Release (install: https://cli.github.com)"
fi

# Switch back to dev
git checkout dev

echo ""
echo "🚀 Deployed v${NEW_VERSION} to production!"
echo "   • main branch pushed → Netlify will auto-deploy"
echo "   • Tagged: v${NEW_VERSION}"
echo "   • GitHub Release created"
echo "   • Back on dev branch"
