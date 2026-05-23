# Sentinel

Lightweight self-hosted uptime monitoring: HTTP health checks, a Postgres-backed history, and a Next.js operations dashboard.

**What works today:** checker worker, PostgreSQL + Prisma, live dashboard (overview, targets, incidents, per-target detail), production Docker deployment behind Apache, **telemetry agent + collector (dev / Docker `telemetry` profile)**.

**Planned:** dashboard telemetry charts, collector in prod compose, full REST API surface, persistent incidents table, alerts.

---

## Quick start

### Local development

```bash
pnpm install
cp .env.example .env
./dev.sh
```

- Dashboard: http://localhost:3000
- Postgres: `127.0.0.1:5432` (Docker via `docker-compose.yml`)
- Telemetry (optional): `docker compose --profile telemetry up -d --build` — collector gRPC on `127.0.0.1:50051` (see `.env.example`)

### Production (VPS)

```bash
cd /var/www/sentinel
cp .env.production.example .env   # set POSTGRES_PASSWORD + DATABASE_URL
chmod 600 .env
./build.sh
```

Configure Apache to proxy to port **3010** (dashboard). See [docs/deployment.md](docs/deployment.md).

---

## How it works

```text
Checker (every 30s)  --HTTP-->  your URLs
        |
        v
   PostgreSQL  (MonitoredTarget, HealthCheck, TelemetryMetric)
        ^                    ^
        |                    | gRPC SendMetrics (optional)
   Dashboard          Collector <-- Agent (CPU metrics)
   (Next.js + Prisma)
```

1. **Targets** are rows in `MonitoredTarget` (name, url, interval).
2. The **checker** pings each URL and appends a `HealthCheck` row (`UP`/`DOWN`, latency, status code).
3. The **dashboard** aggregates those rows for charts, tables, and derived incidents (e.g. 3× `DOWN` in a row = active incident).
4. The **agent** collects host metrics and sends them to the **collector** over gRPC; the collector writes `TelemetryMetric` rows (dashboard UI for telemetry is not wired yet).

The Express **API** (`apps/api`) is in the stack for future REST use; the dashboard does not depend on it yet.

Full diagrams: [docs/architecture.md](docs/architecture.md)

---

## Repository structure

```text
sentinel/
├── apps/
│   ├── checker/          # Background HTTP health-check worker
│   ├── dashboard/        # Next.js UI (production: port 3010)
│   ├── api/              # Express API (scaffold, port 4010)
│   ├── collector/        # gRPC telemetry server (ingest → TelemetryMetric)
│   └── agent/            # Host metrics client (CPU today)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/monitored-targets.sql
├── docs/                 # Detailed documentation
├── deploy/apache/        # Example reverse proxy config
├── docker-compose.yml    # Dev: Postgres only
├── docker-compose.prod.yml
├── build.sh              # Prod: build, migrate, seed, up
└── dev.sh                # Dev: Postgres + migrate + checker + dashboard
```

---

## Documentation

| Doc                                          | Contents                                            |
| -------------------------------------------- | --------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md) | Data flow, dev vs prod topology, what's implemented |
| [docs/deployment.md](docs/deployment.md)     | VPS deploy, `.env`, Apache, troubleshooting         |
| [docs/dashboard.md](docs/dashboard.md)       | Pages, queries, UI, mobile layout                   |
| [docs/checker.md](docs/checker.md)           | Scheduler, HTTP checks, Docker worker               |
| [docs/agent.md](docs/agent.md)               | gRPC client, collectors, scheduler, timeouts        |
| [docs/collector.md](docs/collector.md)       | gRPC server, TelemetryMetric persistence            |
| [docs/database.md](docs/database.md)         | Prisma schema, migrations, indexes, seeding         |

---

## Technology stack

| Layer     | Tech                                                     |
| --------- | -------------------------------------------------------- |
| Database  | PostgreSQL 16, Prisma                                    |
| Worker    | Node.js, TypeScript, axios, pino                         |
| Dashboard | Next.js 16, React 19, Tailwind v4, Recharts              |
| API       | Express 5 (health endpoint today)                        |
| Deploy    | Docker Compose, multi-stage images, Apache reverse proxy |
| Monorepo  | pnpm workspaces                                          |

---

## Production services

| Service   | Exposed     | Role                        |
| --------- | ----------- | --------------------------- |
| dashboard | Host `3010` | `next build` + `next start` |
| api       | Host `4010` | REST (minimal today)        |
| checker   | Internal    | Writes health checks        |
| postgres  | Internal    | Persistent volume           |

Only dashboard and API should be proxied from Apache. Checker and Postgres stay on the Docker internal network.

---

## Telemetry stack (optional, dev)

```bash
docker compose --profile telemetry up -d --build
docker compose --profile telemetry logs -f agent collector
```

See [docs/agent.md](docs/agent.md) and [docs/collector.md](docs/collector.md).

---

## Common commands

```bash
# Prisma
pnpm db:generate
pnpm prisma migrate dev          # local schema changes
pnpm exec prisma migrate deploy  # apply migrations (also via build.sh)

# Production
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs checker --tail 50
```

---

## Status

Active development. Current focus: reliable uptime monitoring and a fast dashboard at scale as `HealthCheck` data grows (indexes + SQL aggregates in place).

---

## Author

David Martin — backend and platform engineering.
