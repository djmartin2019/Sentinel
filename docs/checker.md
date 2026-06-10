# Checker app

The `checker` is a background worker that loads every `MonitoredTarget` from Postgres, runs an HTTP GET against each URL, and inserts a `HealthCheck` row with the result. It runs on a fixed **2-minute** interval (the per-target `interval` column is stored but not yet used by the scheduler).

## How it works

```text
index.ts
  └── startScheduler()
        ├── runChecks() immediately
        └── setInterval(runChecks, 120_000)

runChecks()  (checker.service.ts)
  ├── prisma.monitoredTarget.findMany()
  ├── for each target: httpCheck(url)
  └── prisma.healthCheck.create(...)
```

### Entry point — `src/index.ts`

Loads root `.env` when present (for local dev). In Docker, `DATABASE_URL` comes from Compose environment variables.

### Scheduler — `src/scheduler/scheduler.ts`

Runs `runChecks()` on startup and every 2 minutes. Errors in a cycle are caught and logged so one failure does not crash the process.

### HTTP check — `src/checks/httpCheck.ts`

- `axios` GET with **5s timeout**
- **UP** if status 2xx–3xx
- **DOWN** on other codes or network errors; `errorMessage` captured

### Logger — `src/logger/logger.ts`

- **Production:** JSON logs via pino (`NODE_ENV=production`)
- **Development:** `pino-pretty` for readable console output

## Database writes

Each successful cycle adds **one row per target** to `HealthCheck`. Row volume grows continuously (~720 rows/target/day at 2-minute intervals). The dashboard aggregates reads; consider a retention policy as data grows.

## Running locally

From monorepo root (with Postgres up):

```bash
./dev.sh          # starts Postgres, migrates, checker + dashboard
```

Or checker only:

```bash
pnpm db:generate
cd apps/checker
pnpm dev          # tsx watch
```

Production build:

```bash
pnpm build        # tsc → dist/
pnpm start        # node dist/index.js
```

## Production (Docker)

The checker image is built from [`apps/checker/Dockerfile`](../apps/checker/Dockerfile):

- Multi-stage build with `prisma generate` and compiled TypeScript
- Preserves pnpm workspace layout so `@prisma/client` engines work
- **No published ports** — only reachable on `sentinel-internal` network
- Started by `./build.sh` with `restart: unless-stopped`

Verify:

```bash
docker compose -f docker-compose.prod.yml logs -f checker
```

Expect JSON lines such as `Starting check cycle`, `Checking https://…`, `Check cycle complete`.

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string; use host `postgres` in Docker prod |
| `NODE_ENV` | `production` in Docker |
| `LOG_LEVEL` | Optional pino level (default `info`) |

## Related docs

- [database.md](./database.md) — schema and migrations
- [dashboard.md](./dashboard.md) — how check results are displayed
- [deployment.md](./deployment.md) — full stack deploy
