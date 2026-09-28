#!/usr/bin/env bash
# Shared push helper for scripts/push.sh and scripts/deploy.sh (sourced).
#
# push_ref <ref> - push a branch or tag to origin. Tries the configured remote
# first (SSH on a developer machine); when that fails - an agent sandbox or CI
# without an SSH key - it retries over HTTPS with the GitHub CLI as the
# one-shot credential helper (needs `gh auth login` with `repo` scope). The
# remote configuration itself is never changed.

push_ref() {
  local ref="$1"
  if GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o BatchMode=yes -o ConnectTimeout=15}" git push origin "$ref"; then
    return 0
  fi
  local url
  url=$(git remote get-url origin)
  # git@github.com:owner/repo(.git) or https://github.com/owner/repo(.git)
  local slug
  slug=$(echo "$url" | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')
  if ! command -v gh &> /dev/null || ! gh auth status &> /dev/null; then
    echo "❌ push of ${ref} failed, and gh is not logged in for the HTTPS fallback (run: gh auth login)"
    return 1
  fi
  echo "↻ ssh push failed - retrying ${ref} over HTTPS with gh credentials"
  git -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
    push "https://github.com/${slug}.git" "$ref" || return 1
  # a push to a URL leaves refs/remotes/origin/* stale ("ahead N") - move the
  # tracking ref of a pushed branch to what GitHub now has
  if git show-ref -q --verify "refs/heads/${ref}"; then
    git update-ref "refs/remotes/origin/${ref}" "refs/heads/${ref}"
  fi
}
