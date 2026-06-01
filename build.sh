#!/usr/bin/env bash
# Production deploy: pull latest git, then run ./update.sh (images, migrations, apps).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CYAN='\033[0;36m'
RESET='\033[0m'

info() { echo -e "${CYAN}◆${RESET} $*"; }

info "Pulling latest changes..."
git pull --ff-only

exec "$ROOT/update.sh"
