#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── colours ────────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

log()  { echo -e "${DIM}[$(date +%H:%M:%S)]${RESET} $*"; }
info() { echo -e "${CYAN}◆${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET} $*"; }
die()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }

# ── cleanup on exit ────────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  info "Shutting down..."
  for pid in "${PIDS[@]}"; do
    # Kill child processes (pnpm, next, tsx) then the subshell
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "All processes stopped."
}
trap cleanup EXIT INT TERM

# ── 1. docker / postgres ───────────────────────────────────────────────────────
info "Starting Postgres via Docker Compose..."
docker compose up -d --quiet-pull

log "Waiting for Postgres to accept connections..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U sentinel -d sentinel -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -eq 0 ]] && die "Postgres did not become ready in time."
  sleep 1
done
ok "Postgres is ready."

# ── 2. prisma migrate + generate ──────────────────────────────────────────────
info "Running Prisma migrations..."
if ! pnpm prisma migrate deploy; then
  die "Prisma migrate deploy failed."
fi
ok "Migrations applied."

info "Generating Prisma client..."
pnpm db:generate
ok "Prisma client ready."

# ── 3. launch apps ────────────────────────────────────────────────────────────
echo ""
info "Starting services..."

# Checker
(
  cd "$ROOT/apps/checker"
  pnpm dev 2>&1 | sed $'s/^/\033[36m[checker] \033[0m/'
) &
CHECKER_PID=$!
PIDS+=("$CHECKER_PID")
ok "Checker started  (pid $CHECKER_PID)"

# Dashboard
(
  cd "$ROOT/apps/dashboard"
  pnpm dev 2>&1 | sed $'s/^/\033[35m[dashboard] \033[0m/'
) &
DASHBOARD_PID=$!
PIDS+=("$DASHBOARD_PID")
ok "Dashboard started (pid $DASHBOARD_PID)"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${CYAN}Sentinel dev environment running${RESET}"
echo -e "  Dashboard → ${CYAN}http://localhost:3000${RESET}"
echo -e "  Postgres  → ${DIM}127.0.0.1:5432${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${DIM}Ctrl+C to stop all processes${RESET}"
echo ""

wait
