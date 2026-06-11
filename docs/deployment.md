# Production deployment

Deploy Sentinel on a VPS with Docker Compose behind Apache.

## Prerequisites

- Ubuntu VPS with Docker and Docker Compose
- Apache with `proxy`, `proxy_http`, `headers`, `ssl`, `rewrite`
- Git clone at `/var/www/sentinel` (path used in examples below)
- DNS for your dashboard hostname (e.g. `sentinel.djm-apps.com`)

## Environment file

Copy the example and set secrets:

```bash
cd /var/www/sentinel
cp .env.production.example .env
chmod 600 .env
```

Required variables:

```env
POSTGRES_USER=sentinel
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=sentinel

# Host MUST be "postgres" (Docker service name), not 127.0.0.1
DATABASE_URL=postgresql://sentinel:<same-password>@postgres:5432/sentinel?schema=public

PUBLIC_HOST=sentinel.djm-apps.com
```

Use a password without URL-breaking characters (`@`, `:`, `#`, `?`), or URL-encode the password segment in `DATABASE_URL`.

## Deploy

**Full deploy (pull + update):**

```bash
./build.sh
```

**Update only** (after you have already `git pull` on the server):

```bash
./update.sh
```

`build.sh` runs `git pull --ff-only`, then `./update.sh`.

`update.sh` will:

1. Build images (`dashboard`, `api`, `checker`, `retention`, `migrate`, `backfill`)
2. Start Postgres and wait for health
3. Run `prisma migrate deploy` via the migrate container
4. Run idempotent seed [`prisma/seed/monitored-targets.sql`](../prisma/seed/monitored-targets.sql) (skips existing URLs)
5. Run idempotent incident backfill via the backfill container (skips targets that already have incidents; set `SKIP_BACKFILL=1` to skip)
6. Recreate and start `dashboard`, `api`, `checker`, and `retention`

**One-time aggregate backfill** (after the rollup migration): run manually with [`./scripts/backfill-healthcheck-aggregates.sh`](../scripts/backfill-healthcheck-aggregates.sh). See [database-rollups.md](./database-rollups.md#historical-aggregate-backfill). Not included in `./update.sh`.

### Services and ports

| Service | Host port | Notes |
|---------|-----------|--------|
| dashboard | `3010` | Next.js production (`next build` + `next start`) |
| api | `4010` | Express; `/health` |
| checker | — | Internal worker only |
| postgres | — | Internal; data in volume `sentinel-prod_postgres_data` |

## Apache

Example config: [`deploy/apache/sentinel.conf`](../deploy/apache/sentinel.conf).

```bash
sudo cp deploy/apache/sentinel.conf /etc/apache2/sites-available/sentinel.conf
sudo a2enmod proxy proxy_http headers ssl rewrite
sudo a2ensite sentinel
sudo certbot --apache -d sentinel.djm-apps.com
sudo systemctl reload apache2
```

Proxy the dashboard to `http://127.0.0.1:3010/`. Optionally expose the API under `/api/` → `http://127.0.0.1:4010/`.

Do **not** expose Postgres or the checker to the public internet.

## Verify

```bash
docker compose -f docker-compose.prod.yml ps
curl -s http://127.0.0.1:4010/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3010/

docker compose -f docker-compose.prod.yml logs checker --tail 20
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U sentinel -d sentinel -c 'SELECT COUNT(*) FROM "HealthCheck";'
```

## Adding monitored targets

Edit [`prisma/seed/monitored-targets.sql`](../prisma/seed/monitored-targets.sql) and redeploy, or insert via SQL:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U sentinel -d sentinel
```

The checker picks up new targets on the next cycle (within 2 minutes).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `P1013` invalid database URL | Password special chars in `DATABASE_URL`; use encoding or simpler password |
| `P1000` authentication failed | Postgres volume initialized with old password — `ALTER USER` or recreate volume |
| Checker crash loop | `docker compose logs checker` — usually Prisma client or `DATABASE_URL` |
| Empty dashboard | Seed ran? `SELECT * FROM "MonitoredTarget";` — wait for checker cycles |
| Slow dashboard after days | Normal growth of `HealthCheck`; ensure latest migration indexes are applied |

## Files reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack |
| `docker-compose.yml` | Dev Postgres only |
| `build.sh` | Git pull + `update.sh` |
| `update.sh` | Build images, migrate, seed, backfill, restart apps |
| `apps/*/Dockerfile` | Per-app production images |
| `.env.production.example` | Env template |
