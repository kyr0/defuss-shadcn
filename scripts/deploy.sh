#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [patch|minor|major] [alpha|beta|rc|release]
# Default: patch, preserving current prerelease suffix
#
# Examples:
#   ./scripts/deploy.sh              → 0.9.0        → 0.9.1        (patch bump, keep suffix)
#   ./scripts/deploy.sh minor        → 0.9.1        → 0.10.0       (minor bump)
#   ./scripts/deploy.sh patch beta   → 0.4.0-alpha  → 0.4.1-beta   (patch bump, change to beta)
#   ./scripts/deploy.sh patch release→ 0.4.1-beta   → 0.4.2        (patch bump, drop suffix)
#
# This is a RELEASE deploy, run on main with a clean tree (agent state in
# .agents/ excepted). It:
#   0. Commits pending agent state (.agents/: episodes, memory) on its own
#   1. Moves EVERY version site to the new version (scripts/bump-version.ts:
#      package.json, the Claude Code plugin manifest, the shared-ABI stamp,
#      the deck cover - verify's `version sites` gate checks them)
#   2. Adds a changelog entry with every commit message since the last
#      release tag
#   3. Runs the full pipeline (make build: lint → compile → … → verify → tests → e2e)
#   4. Two-commit rule (verify's "changelog ↔ version" gate): commits the
#      entry while the committed version is still the old one, then a SECOND
#      commit stamps that commit's short hash into the entry and lands the bump
#   5. Tags v<version>, pushes the tag, then main (SSH, else HTTPS via gh -
#      see scripts/lib/git-push.sh) - docs/ is the release snapshot pinned to
#      that tag, so the tag must exist first - creates the GitHub Release
#   6. Purges the jsDelivr @latest cache, so README's @latest quick start
#      serves the new tag right away (the docs snapshot is pinned to the tag
#      and needs no purge)
#
# For non-release changes (README, doc fixes, etc.), use:
#   bun run push

source "$(dirname "$0")/lib/git-push.sh"

BUMP_TYPE="${1:-patch}"
PHASE="${2:-}"  # alpha, beta, rc, release, or empty (keep current)

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ You must be on main to deploy. Currently on: $CURRENT_BRANCH"
  exit 1
fi

# .agents/ is agent state (the gate's episode log, memory, the sub-agent
# registry) that changes on its own while agents work. No build step reads it
# and no release ships it, so it never blocks a release: step 0 commits it on
# its own, and step 4b's bump commit adds everything but it.
AGENT_STATE=':(exclude).agents'
if [[ -n $(git status --porcelain -- . "$AGENT_STATE") ]]; then
  echo "❌ Working tree is dirty (outside .agents/). Commit or stash changes first."
  exit 1
fi

# Read current version from package.json (may include prerelease suffix like -alpha)
FULL_VERSION=$(node -p "require('./package.json').version")
BASE_VERSION=$(echo "$FULL_VERSION" | sed 's/-.*//')
CURRENT_SUFFIX=$(echo "$FULL_VERSION" | grep -o '\-.*' || true)

IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE_VERSION"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "❌ Invalid bump type: $BUMP_TYPE (use patch, minor, or major)"; exit 1 ;;
esac
NEW_BASE="${MAJOR}.${MINOR}.${PATCH}"

if [[ "$PHASE" == "release" ]]; then
  NEW_SUFFIX=""
elif [[ -n "$PHASE" ]]; then
  NEW_SUFFIX="-${PHASE}"
else
  NEW_SUFFIX="$CURRENT_SUFFIX"
fi
NEW_VERSION="${NEW_BASE}${NEW_SUFFIX}"
TAG="v${NEW_VERSION}"

if git rev-parse -q --verify "refs/tags/${TAG}" > /dev/null; then
  echo "❌ Tag ${TAG} already exists."
  exit 1
fi

echo "📦 Releasing v${FULL_VERSION} → ${TAG} (${BUMP_TYPE}${PHASE:+, phase: $PHASE})"

# 0. agent state the sessions before this release left behind lands as its own
# commit, after every precondition passed and before anything is bumped
if [[ -n $(git status --porcelain -- .agents) ]]; then
  git add -A -- .agents
  git commit -m "chore(agents): updated agent memory after self-reflection"
fi

# 1. every version site
bun scripts/bump-version.ts "${NEW_VERSION}"

# 2. changelog entry from the commits since the last release tag. Tags have
# been written both with and without the v prefix (0.9.0, v0.8.3) - take the
# newest tag reachable from HEAD, whatever its spelling.
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
DATE=$(date +"%B %d, %Y")
if [[ -n "$LAST_TAG" ]]; then
  COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s" --no-merges | grep -v "^chore: bump version" || true)
else
  COMMITS=$(git log --pretty=format:"%s" --no-merges | grep -v "^chore: bump version" || true)
fi
COMMIT_LINES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && COMMIT_LINES+=("$line")
done < <(echo "$COMMITS" | awk '!seen[$0]++')
bun scripts/changelog-entry.ts add "${NEW_VERSION}" "${DATE}" ${COMMIT_LINES[@]+"${COMMIT_LINES[@]}"}
echo "✅ Changelog entry for ${TAG} (${#COMMIT_LINES[@]} commits since ${LAST_TAG:-the first commit})"

# 3. the full pipeline from the bumped sources (same gates as CI)
E2E_ALL=1 make build # a release runs every e2e file, changed or not

# 4a. first commit: the entry alone, while the COMMITTED version is still the
# old one - every commit on main stays verify-green. docs/ is NOT part of it:
# make build already re-snapshotted docs/ for the new version (pinned to the
# new tag), which only matches the committed version after 4b.
git add src/documentation/data/changelog.json dist/documentation/changelog.html
git commit -m "docs(changelog): add ${TAG} entry"
ENTRY_HASH=$(git rev-parse --short HEAD)

# 4b. second commit: stamp that hash into the entry, regenerate, land the bump
# (the tree was clean outside .agents/ before step 1, so everything left there
# is this release; agent state stays for its own commit)
bun scripts/changelog-entry.ts stamp-hash "${NEW_VERSION}" "${ENTRY_HASH}"
# --force: docs/ already carries this version's stamp from make build, but
# the changelog page just changed (the hash) - re-snapshot it
bun scripts/build.ts && bun scripts/bundle.ts && bun scripts/minify.ts && bun scripts/stats.ts && bun run build:docs && bun scripts/sync-docs.ts --force
PAGE_TIMEOUT_MS=60000 bun run screenshots
bun scripts/verify.ts
git add -A -- . "$AGENT_STATE"
git commit -m "chore: bump version to ${TAG} (changelog ${ENTRY_HASH})"

# 5. tag, push, GitHub Release. The TAG goes first: the docs/ snapshot loads
# its assets from jsDelivr @${TAG}, so the tag must exist before GitHub Pages
# publishes main (a page going live before its tag would fetch 404s).
git tag "${TAG}"
push_ref "${TAG}"
push_ref main

RELEASE_NOTES=$(echo "$COMMITS" | awk '!seen[$0]++' | grep . | sed 's/^/- /' || true)
if [[ -z "$RELEASE_NOTES" ]]; then
  RELEASE_NOTES="- Maintenance release"
fi
if command -v gh &> /dev/null; then
  gh release create "${TAG}" --title "${TAG}" --notes "$RELEASE_NOTES" --verify-tag
  echo "✅ Created GitHub Release ${TAG}"
  # the vendoring ZIPs (one per section bundle + all) the Bundles & Downloads
  # page links as releases/download/${TAG}/… - built from the dist/ just released
  # non-fatal like purge-cdn: the tag and the release already exist, so a
  # failure here must not skip the steps after it - rerun it by hand.
  # UNKNOWN: unobserved until the next release (bash -n passes)
  if bun run release-zips && gh release upload "${TAG}" release/*.zip --clobber; then
    echo "✅ Attached $(ls release/*.zip | wc -l | tr -d ' ') ZIPs to ${TAG}"
  else
    echo "⚠️  release ZIPs failed - run \`bun run release-zips && gh release upload ${TAG} release/*.zip --clobber\`"
  fi
else
  echo "⚠️  gh CLI not found - skipping GitHub Release (install: https://cli.github.com)"
fi

# 6. the docs load their assets from jsDelivr @latest - make it re-resolve now
bun run purge-cdn || echo "⚠️  purge-cdn failed - run \`bun run purge-cdn\` again once GitHub has the tag"

echo ""
echo "🚀 Released ${TAG}"
echo "   • main + ${TAG} pushed (GitHub Pages serves docs/ from main)"
echo "   • GitHub Release created"
echo "   • jsDelivr @latest purged"
