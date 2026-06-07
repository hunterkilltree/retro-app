#!/usr/bin/env bash
#
# Run the Playwright E2E suite against any target.
#
# Usage:
#   ./run-e2e.sh                                  # local (http://localhost:3000)
#   ./run-e2e.sh https://retro-frontend.onrender.com   # against a deployed URL
#   ./run-e2e.sh https://... --workers=1          # extra Playwright flags pass through
#   ./run-e2e.sh --ui                             # local, interactive UI mode
#
# The first argument, if it looks like a URL, sets PLAYWRIGHT_BASE_URL.
# Everything else is forwarded straight to `playwright test`.
set -euo pipefail

# Run from this script's directory (retro-fe), so npm/playwright resolve.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# First arg is the target URL only if it looks like one; otherwise fall back to
# the existing env var or the local default, and keep the arg for Playwright.
if [[ "${1:-}" =~ ^https?:// ]]; then
  export PLAYWRIGHT_BASE_URL="$1"
  shift
else
  export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
fi

echo "▶ Playwright E2E target: $PLAYWRIGHT_BASE_URL"

# Ensure the Chromium browser binary is present (no-op if already installed).
npx playwright install chromium >/dev/null 2>&1 || true

# Forward any remaining args (e.g. --workers=1, --ui, a spec path) to Playwright.
npm run test:e2e -- "$@"
