# Architecture

How Sentinel fits together today: what runs where, how data flows, and what is still planned.

## Implemented today

| Component | Status | Role |
|-----------|--------|------|
| **PostgreSQL** | Production | Stores `MonitoredTarget` and `HealthCheck` rows |
| **Checker** | Production | HTTP health checks every 30s, writes results to DB |
| **Dashboard** | Production | Next.js UI reads Postgres directly via Prisma |
| **API** | Scaffold | Express server with `/health`; REST surface not wired to dashboard yet |
| **Collector** | Dev / Docker profile | gRPC ingest on `:50051`, writes `TelemetryMetric` |
| **Agent** | Dev / Docker profile | Sends host metrics to collector via gRPC |

## Data flow

```text
  Monitored URLs (websites, APIs)
           ^
           | HTTP GET (5s timeout)
           |
  +--------+---------+
  |  Checker worker  |  every 30s, all targets
  +--------+---------+
           |
           | INSERT HealthCheck
           v
  +--------+---------+
  |   PostgreSQL     |
  | MonitoredTarget  |
  | HealthCheck      |
  | TelemetryMetric  |  <-- agent → collector (optional)
  +--------+---------+
           ^
           | Prisma (aggregated queries)
           |
  +--------+---------+
  | Next.js Dashboard|  Server Components, port 3010
  +------------------+
           ^
           | Apache reverse proxy (HTTPS)
           |
       Browser
```

The dashboard does **not** call the Express API for page data today. It uses `apps/dashboard/lib/data/` against the same database the checker writes to.

Incidents on the UI are **derived** from recent `HealthCheck` rows (e.g. three consecutive `DOWN` results), not stored in a separate `incidents` table.

### Telemetry pipeline (optional)

```text
  +--------+     gRPC      +-----------+     INSERT    +----------------+
  | Agent  | --SendMetrics-> | Collector | ------------> | TelemetryMetric |
  +--------+   :50051      +-----------+               +----------------+
```

- Started with `docker compose --profile telemetry up` (dev only today).
- Not in production `docker-compose.prod.yml` yet (commented stub).
- Dashboard heatmap does not query this table yet.

Details: [agent.md](./agent.md), [collector.md](./collector.md).

## Production topology (Docker)

Deploy path on VPS: `/var/www/sentinel` (see [deployment.md](./deployment.md)).

```text
                    Host (Ubuntu VPS)
  +--------------------------------------------------+
  |  Apache :443  --> 127.0.0.1:3010  (dashboard)    |
  |              --> 127.0.0.1:4010  (api, optional) |
  +--------------------------------------------------+
                          |
          Docker network: sentinel-internal
  +--------------------------------------------------+
  |  dashboard:3010   api:4010                       |
  |  checker (no ports)   postgres (no host ports)   |
  +--------------------------------------------------+
```

- **Published on host:** dashboard `3010`, API `4010`
- **Internal only:** Postgres, checker (and future collector on `50051`)
- Apache should proxy **only** dashboard and API — not Postgres or the checker

## Development topology

```text
  ./dev.sh
    |
    +-- docker compose.yml  -->  Postgres on localhost:5432
    +-- pnpm prisma migrate deploy
    +-- apps/checker   pnpm dev  (tsx watch)
    +-- apps/dashboard pnpm dev  (next dev, :3000)

  Optional telemetry:
    docker compose --profile telemetry up  -->  collector :50051 + agent
```

Dev uses host-run Node processes for checker and dashboard; only Postgres runs in Docker.

## Query performance

`HealthCheck` grows continuously (~20k rows/day with 7 targets at 30s intervals). The dashboard uses:

- Indexes on `checkedAt` and `(targetId, checkedAt DESC)`
- SQL aggregates (`GROUP BY`, `date_trunc`, `DISTINCT ON`) in [`apps/dashboard/lib/data/health-checks/`](../apps/dashboard/lib/data/health-checks/)
- A bundled overview loader `getOverviewPageData()` to avoid duplicate 30-day scans per page load

See [dashboard.md](./dashboard.md#data-layer) for details.

## Planned architecture

- REST API as the dashboard’s data backend (optional BFF)
- Dashboard charts for `TelemetryMetric` (heatmap / host metrics)
- Collector + agent in production compose (TLS, auth)
- Persistent `incidents` table and alert channels (Discord, email)
- Check retention job (prune old `HealthCheck` rows)
