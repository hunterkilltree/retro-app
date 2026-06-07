#!/usr/bin/env bash
#
# Run the whole Retro stack in Docker — no Java/Node setup on your machine.
#
#   ./run-docker.sh            # build + start all containers, wait until ready, leave running
#   ./run-docker.sh --test     # ...then run the Playwright E2E suite (needs Node locally), keep running
#   ./run-docker.sh --logs     # ...then follow container logs (Ctrl-C just stops the log stream)
#   ./run-docker.sh --down     # stop & remove the containers (and volumes)
#
# Starts these containers (see compose.yml):
#   • postgres  (5432)
#   • backend   (8080)   ← Spring Boot, so you don't need Java installed
#   • frontend  (3000)   ← Next.js
#
# Only Docker is required. Open http://localhost:3000 once it's up.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8080"

MODE="up"   # up | test | logs | down
while [[ $# -gt 0 ]]; do
  case "$1" in
    --test) MODE="test"; shift ;;
    --logs) MODE="logs"; shift ;;
    --down) MODE="down"; shift ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

log()  { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

command -v docker >/dev/null 2>&1 || { warn "docker not found — install Docker Desktop first."; exit 1; }

# `docker compose` (v2) vs legacy `docker-compose`.
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  warn "Neither 'docker compose' nor 'docker-compose' is available."; exit 1
fi

if [[ "$MODE" == "down" ]]; then
  log "Stopping and removing containers…"
  "${DC[@]}" down -v
  ok "Stack stopped."
  exit 0
fi

wait_for_http() {
  local url="$1" name="$2" tries="${3:-90}"
  log "Waiting for $name ($url)…"
  for ((i = 1; i <= tries; i++)); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    if [[ "$code" != "000" ]]; then ok "$name is up (HTTP $code)"; return 0; fi
    sleep 2
  done
  warn "$name did not come up in time. Check: ${DC[*]} logs"
  return 1
}

# ── Build + start all containers (detached) ───────────────────────────────────
log "Building and starting containers (this can take a while the first time)…"
"${DC[@]}" up --build -d

wait_for_http "$BACKEND_URL/api/rooms" "backend" 120
wait_for_http "$FRONTEND_URL" "frontend" 60

echo
ok "Stack is running in Docker:"
echo "    Frontend : $FRONTEND_URL   (open this)"
echo "    Backend  : $BACKEND_URL"
echo "    Stop it  : ./run-docker.sh --down   (or: ${DC[*]} down)"
echo

case "$MODE" in
  logs)
    log "Following container logs — Ctrl-C stops the log stream (containers keep running)."
    "${DC[@]}" logs -f
    ;;
  test)
    if ! command -v npm >/dev/null 2>&1; then
      warn "Node/npm not found on this machine — can't run the host-side E2E suite."
      warn "The app is still running in Docker at $FRONTEND_URL."
      exit 1
    fi
    log "Running Playwright E2E against the dockerized app…"
    ( cd retro-fe \
        && npx playwright install chromium >/dev/null 2>&1 || true; \
        PLAYWRIGHT_BASE_URL="$FRONTEND_URL" npm run test:e2e )
    ;;
  up)
    : # already up; leave the containers running.
    ;;
esac
