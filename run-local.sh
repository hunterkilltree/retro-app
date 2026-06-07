#!/usr/bin/env bash
#
# Start the whole Retro stack locally and run the project checks.
#
#   ./run-local.sh            # boot DB + backend + frontend, then run the E2E suite, then tear down
#   ./run-local.sh --serve    # boot the stack and keep it running (Ctrl-C to stop); no tests
#   ./run-local.sh --e2e-args "--workers=1"   # forward extra flags to Playwright
#
# Layout it drives:
#   • Postgres  → docker compose (port 5432)
#   • Backend   → retro-server, ./gradlew bootRun (port 8080)
#   • Frontend  → retro-fe, npm run dev (port 3000), BACKEND_URL=http://localhost:8080
#
# NOTE: this is the LOCAL-DEV topology (not the all-docker one) on purpose — the
# browser connects to the WebSocket at BACKEND_URL/ws, which must be reachable
# from the host, i.e. http://localhost:8080.
#
# Requirements: docker (+ compose), Java 21, Node. Run from a bash shell
# (macOS/Linux/WSL/Git Bash).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
LOG_DIR="$ROOT_DIR/.local-run-logs"
mkdir -p "$LOG_DIR"

SERVE_ONLY=0
E2E_ARGS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --serve) SERVE_ONLY=1; shift ;;
    --e2e-args) E2E_ARGS="${2:-}"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

BACKEND_PID=""
FRONTEND_PID=""

log()  { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

cleanup() {
  echo
  log "Shutting down…"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
  # Best-effort: free the ports in case child processes outlived their parent.
  pkill -f "next dev"  2>/dev/null || true
  pkill -f "bootRun"   2>/dev/null || true
  if [[ "${KEEP_DB:-0}" != "1" ]]; then
    docker compose stop postgres >/dev/null 2>&1 || true
  fi
  ok "Done."
}
trap cleanup EXIT INT TERM

# Verify required tools are available before starting anything.
check_prereqs() {
  local missing=0

  command -v docker >/dev/null 2>&1 || { warn "docker not found — needed for Postgres."; missing=1; }
  command -v node   >/dev/null 2>&1 || { warn "node not found — needed for the frontend."; missing=1; }
  command -v npm    >/dev/null 2>&1 || { warn "npm not found — needed for the frontend."; missing=1; }

  # Java: gradlew uses JAVA_HOME, falling back to `java` on PATH.
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    :
  elif command -v java >/dev/null 2>&1; then
    :
  else
    missing=1
    warn "Java not found — the backend needs JDK 21."
    cat <<'EOF'
  Fix: install a JDK 21 and make it discoverable, then re-run this script.
    • Install:  https://adoptium.net  (or `brew install openjdk@21`, `winget install EclipseAdoptium.Temurin.21.JDK`, or sdkman)
    • Then point JAVA_HOME at it for this shell, e.g.:
        macOS/Linux : export JAVA_HOME="$(/usr/libexec/java_home -v 21)"   # macOS
                      export JAVA_HOME=/usr/lib/jvm/java-21                # Linux
        Git Bash    : export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.x.x-hotspot"
                      export PATH="$JAVA_HOME/bin:$PATH"
    • Verify:   java -version    (should print 21.x)
EOF
  fi

  if [[ "$missing" == "1" ]]; then
    echo
    warn "Missing prerequisites (see above). Aborting before starting any services."
    exit 1
  fi

  # Export JAVA_HOME's java onto PATH so the gradle wrapper definitely finds it.
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
  ok "Prerequisites OK ($(java -version 2>&1 | head -n1))"
}

# Wait until an HTTP endpoint answers with any status code (i.e. the port is up).
wait_for_http() {
  local url="$1" name="$2" tries="${3:-60}"
  log "Waiting for $name ($url)…"
  for ((i = 1; i <= tries; i++)); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    if [[ "$code" != "000" ]]; then ok "$name is up (HTTP $code)"; return 0; fi
    sleep 2
  done
  warn "$name did not come up in time — check $LOG_DIR"
  return 1
}

# ── 0. Preflight ──────────────────────────────────────────────────────────────
check_prereqs

# ── 1. Database ───────────────────────────────────────────────────────────────
log "Starting Postgres (docker compose)…"
docker compose up -d postgres
for ((i = 1; i <= 30; i++)); do
  if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-retro}" >/dev/null 2>&1; then
    ok "Postgres is ready"; break
  fi
  sleep 2
done

# ── 2. Backend ────────────────────────────────────────────────────────────────
log "Starting backend (./gradlew bootRun)…"
( cd retro-server && ./gradlew bootRun ) >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
# GET /api/rooms has no handler (405), but a response means the server is up.
wait_for_http "$BACKEND_URL/api/rooms" "backend" 90

# ── 3. Frontend ───────────────────────────────────────────────────────────────
log "Starting frontend (npm run dev)…"
if [[ ! -d retro-fe/node_modules ]]; then
  log "Installing frontend dependencies…"
  ( cd retro-fe && npm install ) >"$LOG_DIR/npm-install.log" 2>&1
fi
( cd retro-fe && BACKEND_URL="$BACKEND_URL" npm run dev ) >"$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
wait_for_http "$FRONTEND_URL" "frontend" 60

ok "Stack is up:  frontend $FRONTEND_URL   backend $BACKEND_URL   (logs in $LOG_DIR)"

# ── 4. Serve-only or run the checks ───────────────────────────────────────────
if [[ "$SERVE_ONLY" == "1" ]]; then
  log "Serve mode — press Ctrl-C to stop."
  # Keep the script alive so the trap can tear everything down on exit.
  wait "$FRONTEND_PID"
  exit 0
fi

log "Ensuring Playwright browser is installed…"
( cd retro-fe && npx playwright install chromium ) >"$LOG_DIR/playwright-install.log" 2>&1 || true

log "Running Playwright E2E suite against $FRONTEND_URL…"
set +e
( cd retro-fe && PLAYWRIGHT_BASE_URL="$FRONTEND_URL" npm run test:e2e -- $E2E_ARGS )
TEST_EXIT=$?
set -e

if [[ "$TEST_EXIT" -eq 0 ]]; then ok "E2E suite passed."; else warn "E2E suite failed (exit $TEST_EXIT)."; fi
exit "$TEST_EXIT"
