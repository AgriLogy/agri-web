#!/usr/bin/env bash
#
# Switch the local git profile to the "Personal" identity, run all quality
# gates (lint + typecheck + format + build), then commit and push.
#
# Usage:
#   scripts/push-personal.sh "<commit message>"
#
# The commit message must follow Conventional Commits, e.g.:
#   scripts/push-personal.sh "feat(map): add zoom-to-zone control"
#
# Requires:
#   - SSH host alias "github-personal" configured in ~/.ssh/config
#   - npm dependencies installed

set -euo pipefail

# --- Profile configuration --------------------------------------------------
REMOTE_URL="git@github-personal:mks-zakaria/agri-front.git"
GIT_USER_NAME="mks-zakaria"
GIT_USER_EMAIL="jcaladic@gmail.com"

# --- Argument check ---------------------------------------------------------
if [ "$#" -lt 1 ] || [ -z "${1:-}" ]; then
  echo "Error: commit message is required." >&2
  echo "Usage: $0 \"<commit message>\"" >&2
  exit 1
fi

COMMIT_MESSAGE="$1"

# --- Resolve repository root ------------------------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "==> Repository: $REPO_ROOT"

# --- Apply Personal profile -------------------------------------------------
echo "==> Setting personal git profile"
git remote set-url origin "$REMOTE_URL"
git config user.name "$GIT_USER_NAME"
git config user.email "$GIT_USER_EMAIL"

git remote -v
echo "    user.name  = $(git config user.name)"
echo "    user.email = $(git config user.email)"

# --- Quality gates ----------------------------------------------------------
echo "==> Running lint, typecheck, format check"
npm run check

echo "==> Running production build"
npm run build

# --- Stage, commit, push ----------------------------------------------------
if [ -z "$(git status --porcelain)" ]; then
  echo "==> No changes to commit. Pushing current branch only."
else
  echo "==> Staging all changes"
  git add -A

  echo "==> Committing"
  git commit -m "$COMMIT_MESSAGE"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> Pushing $CURRENT_BRANCH to origin"
git push -u origin "$CURRENT_BRANCH"

echo "==> Done."
