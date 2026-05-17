#!/usr/bin/env bash
# Production deploy script for VPS (/var/www/sentinel).
# Builds images, runs Prisma migrations, and starts the stack in detached mode.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
PUBLIC_HOST="${PUBLIC_HOST:-sentinel.djm-apps.com}"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

info() { echo -e "${CYAN}◆${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
die()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy .env.production.example and set secrets."

info "Pulling latest changes..."
git pull --ff-only

info "Building production images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

info "Starting Postgres..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres

info "Waiting for Postgres to become healthy..."
TRIES=60
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres 2>/dev/null | grep -q '(healthy)'; do
  TRIES=$((TRIES - 1))
  [[ $TRIES -eq 0 ]] && die "Postgres did not become healthy in time."
  sleep 2
done
ok "Postgres is healthy."

info "Running Prisma migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build migrate
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate
ok "Migrations applied."

info "Starting application containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d dashboard api checker
ok "Stack is up."

echo ""
info "Container status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Sentinel production"
echo -e "  Dashboard (public)  → ${CYAN}https://${PUBLIC_HOST}${RESET}"
echo -e "  Dashboard (local) → ${CYAN}http://127.0.0.1:3010${RESET}"
echo -e "  API (local)       → ${CYAN}http://127.0.0.1:4010${RESET}"
echo -e "  API health        → ${CYAN}http://127.0.0.1:4010/health${RESET}"
echo -e "  ${DIM}Checker + Postgres are internal-only (not published).${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
