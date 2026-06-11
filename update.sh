#!/usr/bin/env bash
# Production update after git pull — rebuild images, apply DB changes, restart apps.
# Does not run git pull; use ./build.sh for pull + update, or pull manually then ./update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
PUBLIC_HOST="${PUBLIC_HOST:-sentinel.djm-apps.com}"
SKIP_BACKFILL="${SKIP_BACKFILL:-0}"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

info() { echo -e "${CYAN}◆${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
die()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy .env.production.example and set secrets."

info "Building production images (dashboard, api, checker, retention, migrate, backfill)..."
compose build dashboard api checker retention migrate backfill

info "Ensuring Postgres is running..."
compose up -d postgres

info "Waiting for Postgres to become healthy..."
TRIES=60
until compose ps postgres 2>/dev/null | grep -q '(healthy)'; do
  TRIES=$((TRIES - 1))
  [[ $TRIES -eq 0 ]] && die "Postgres did not become healthy in time."
  sleep 2
done
ok "Postgres is healthy."

info "Running Prisma migrations..."
compose run --rm migrate
ok "Migrations applied."

SEED_FILE="prisma/seed/monitored-targets.sql"
[[ -f "$SEED_FILE" ]] || die "Missing $SEED_FILE"
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d ' "')" || true
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d ' "')" || true
POSTGRES_USER="${POSTGRES_USER:-sentinel}"
POSTGRES_DB="${POSTGRES_DB:-sentinel}"

info "Seeding monitored targets (skips existing URLs)..."
compose exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$SEED_FILE"
ok "Seed complete."

if [[ "$SKIP_BACKFILL" != "1" ]]; then
  info "Backfilling incidents from health-check history (idempotent)..."
  compose run --rm backfill
  ok "Incident backfill finished."
else
  info "Skipping incident backfill (SKIP_BACKFILL=1)."
fi

info "Restarting application containers with new images..."
compose up -d --force-recreate dashboard api checker retention
ok "Stack updated."

echo ""
info "Container status:"
compose ps
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Sentinel production (updated)"
echo -e "  Dashboard (public)  → ${CYAN}https://${PUBLIC_HOST}${RESET}"
echo -e "  Dashboard (local)   → ${CYAN}http://127.0.0.1:3010${RESET}"
echo -e "  API (local)         → ${CYAN}http://127.0.0.1:4010${RESET}"
echo -e "  ${DIM}Run ./build.sh to git pull and update in one step.${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
