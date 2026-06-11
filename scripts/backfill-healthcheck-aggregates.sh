#!/usr/bin/env bash
# One-shot backfill of health-check aggregate tables from existing HealthCheck history.
# Safe to rerun — upserts by (targetId, bucketStart). Does not delete any rows.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"

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

info "Building backfill-aggregates image..."
compose build backfill-aggregates

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

info "Running aggregate backfill (5m → hourly → daily, no pruning)..."
compose run --rm backfill-aggregates
ok "Aggregate backfill finished."

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d ' "')" || true
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d ' "')" || true
POSTGRES_USER="${POSTGRES_USER:-sentinel}"
POSTGRES_DB="${POSTGRES_DB:-sentinel}"

echo ""
info "Verify row counts:"
echo -e "${DIM}  docker compose -f $COMPOSE_FILE exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c \"SELECT COUNT(*) FROM \\\"HealthCheck\\\"; SELECT COUNT(*) FROM \\\"HealthCheckAggregate5m\\\"; SELECT COUNT(*) FROM \\\"HealthCheckAggregateHourly\\\"; SELECT COUNT(*) FROM \\\"HealthCheckAggregateDaily\\\";\"${RESET}"
