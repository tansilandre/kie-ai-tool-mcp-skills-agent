#!/usr/bin/env bash
# One-time first publish of the @kie-ai-tool packages, run by an owner of the
# npm organization in their own terminal. After this, releases come from
# GitHub Actions (release.yml) through npm trusted publishing, with no token.
#
#   bash scripts/first-publish.sh
#
# What it does:
#   1. checks you are logged in to npm (npm login) and on a clean main
#   2. builds and tests
#   3. publishes @kie-ai-tool/mcp, @kie-ai-tool/cli and @kie-ai-tool/openai-server
#      (npm asks for your 2FA code)
#   4. connects each package to this repo's release.yml as its trusted publisher
#      (needs npm 11.15 or newer and 2FA on your npm account)
set -euo pipefail

REPO="tansilandre/kie-ai-tool-mcp-skills-agent"
PACKAGES=("mcp:@kie-ai-tool/mcp" "cli:@kie-ai-tool/cli" "openai:@kie-ai-tool/openai-server")

cd "$(dirname "$0")/.."

if ! user=$(npm whoami 2>/dev/null); then
  echo "You are not logged in to npm. Run: npm login   (then run this again)"
  exit 1
fi
echo "Logged in to npm as: $user"

if [ -n "$(git status --porcelain)" ] || [ "$(git branch --show-current)" != "main" ]; then
  echo "Run this on a clean, up-to-date main branch (git switch main && git pull)."
  exit 1
fi

echo "Building and testing..."
npm ci --no-audit --no-fund
npm run build
npm test

for pkg in "${PACKAGES[@]}"; do
  dir="${pkg%%:*}"
  name="${pkg#*:}"
  ver=$(node -p "require('./packages/$dir/package.json').version")
  if npm view "$name@$ver" version >/dev/null 2>&1; then
    echo "$name@$ver is already on npm."
  else
    echo "Publishing $name@$ver ..."
    # Provenance only works from CI; this first local publish goes without it.
    npm publish -w "$name" --access public --provenance=false
  fi
done

npm_major=$(npm --version | cut -d. -f1)
npm_minor=$(npm --version | cut -d. -f2)
if [ "$npm_major" -gt 11 ] || { [ "$npm_major" -eq 11 ] && [ "$npm_minor" -ge 15 ]; }; then
  for pkg in "${PACKAGES[@]}"; do
    name="${pkg#*:}"
    echo "Connecting $name to $REPO (release.yml) as trusted publisher..."
    npm trust github "$name" --repo "$REPO" --file release.yml --allow-publish --yes
  done
  echo
  echo "Done. Future releases: bump the versions, push a tag like v0.2.0, and GitHub Actions publishes."
else
  echo
  echo "Published. To let GitHub Actions publish future releases without a token, either:"
  echo "  - update npm (npm install -g npm@latest) and run this script again, or"
  echo "  - on npmjs.com open each package > Settings > Trusted Publisher > GitHub Actions and enter:"
  echo "      Organization or user: tansilandre"
  echo "      Repository:           kie-ai-tool-mcp-skills-agent"
  echo "      Workflow filename:    release.yml"
  echo "    for @kie-ai-tool/mcp, @kie-ai-tool/cli and @kie-ai-tool/openai-server."
fi
