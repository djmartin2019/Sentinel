# Collector app

The **collector** is the gRPC **server** for host telemetry. Agents call `SendMetrics`; the collector validates nothing beyond Prisma insert today, persists rows to `TelemetryMetric`, and returns `{ success: true }`.

Agents never get a `DATABASE_URL` — only the collector writes telemetry to Postgres.

## Role in the stack

```text
  Agent(s)                    Collector                  Postgres
  +--------+                  +-----------+              +------------+
  | gRPC   | --SendMetrics-->  | gRPC      | --INSERT-->  | Telemetry  |
  | client | <--success--      | server    |              | Metric     |
  +--------+                  +-----------+              +------------+
       :50051 (listen)
```

---

## How it works

```text
index.ts
  ├── load root .env (local dev)
  ├── load telemetry.proto
  ├── grpc.Server + addService(SendMetrics handler)
  └── bindAsync(GRPC_HOST:GRPC_PORT)

SendMetrics handler
  └── handleMetrics(metrics)  (telemetry.service.ts)
        └── insertMetrics(metrics)  (metrics.repository.ts)
              └── prisma.telemetryMetric.createMany(...)
```

### Entry point — `src/index.ts`

- Binds gRPC server on `0.0.0.0:50051` by default (all interfaces inside container).
- **Unary RPC** — one request, one response per `SendMetrics` call (no streaming yet).
- Handler delegates to `handleMetrics`; errors become gRPC errors to the agent.

### Service layer — `src/services/telemetry.service.ts`

Thin domain wrapper: calls repository, logs count + `agentId`, returns `true`.

### Repository — `src/db/repositories/metrics.repository.ts`

- Maps gRPC metric messages to Prisma `createMany`.
- **`timestamp`** arrives as string over the wire (`longs: String` in proto loader) — converted with `Number(metric.timestamp)` before `new Date(...)`.

### Stub files (not wired yet)

These exist for future refactor; logic currently lives in `index.ts`:

- `src/grpc/server.ts`
- `src/grpc/handlers/metrics.handler.ts`
- `src/grpc/handlers/heartbeat.handler.ts`
- `src/db/repositories/heartbeat.repository.ts`
- `src/db/repositories/services.repository.ts`

---

## gRPC contract (server view)

Shared with agents: [`packages/proto/telemetry.proto`](../packages/proto/telemetry.proto)

```protobuf
service TelemetryService {
  rpc SendMetrics (MetricsRequest) returns (MetricsResponse);
}

message Metric {
  string agentId = 1;
  string metricType = 2;
  double value = 3;
  int64  timestamp = 4;
}

message MetricsRequest {
  repeated Metric metrics = 1;
}

message MetricsResponse {
  bool success = 1;
}
```

**Batching:** one RPC can carry multiple `Metric` entries (`repeated`). The agent currently sends one CPU metric per tick but the API supports more.

---

## Database writes

Table: **`TelemetryMetric`** (see [database.md](./database.md))

| Column | Source |
|--------|--------|
| `id` | Prisma `cuid()` |
| `agentId` | proto `agentId` |
| `metricType` | proto `metricType` (e.g. `"cpu"`) |
| `value` | proto `value` |
| `recordedAt` | proto `timestamp` (agent clock) |

Index: `(agentId, metricType, recordedAt)` for future chart queries.

Migration: `prisma/migrations/20260518120000_telemetry_metric/`

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | Postgres connection (required) |
| `GRPC_HOST` | `0.0.0.0` | Bind address |
| `GRPC_PORT` | `50051` | gRPC listen port |
| `LOG_LEVEL` | `info` | pino log level |

**Docker Compose** sets `DATABASE_URL` with host `postgres` (service name). **Host dev** uses `127.0.0.1` in root `.env`.

Collector env vars are in [`.env.example`](../.env.example). Production optional block: [`.env.production.example`](../.env.production.example).

---

## Running locally

### Docker Compose (`telemetry` profile)

From monorepo root:

```bash
cp .env.example .env
# Apply migration if needed:
DATABASE_URL=postgresql://sentinel:sentinel@127.0.0.1:5432/sentinel?schema=public \
  pnpm prisma migrate deploy

docker compose --profile telemetry up -d --build
docker compose --profile telemetry logs -f collector agent
```

Collector publishes **`localhost:50051`** to the host for debugging and for agents running outside Docker.

### Collector on host

```bash
docker compose up -d postgres
pnpm db:generate
cd apps/collector
pnpm dev
```

Requires root `.env` with `DATABASE_URL` pointing at `127.0.0.1:5432`.

### Production build

```bash
cd apps/collector
pnpm build
pnpm start
```

Docker image: [`apps/collector/Dockerfile`](../apps/collector/Dockerfile) — runs `prisma generate` at build time.

**Production note:** `docker-compose.prod.yml` has collector commented out. To enable on VPS, uncomment the service, add telemetry env to `.env`, and ensure **50051 is not exposed through Apache** (internal only).

---

## Security (current state)

- **No TLS** — `createInsecure()` / `ServerCredentials.createInsecure()` for local dev.
- **No auth** — any client that can reach `:50051` can insert metrics.
- Production hardening (future): mTLS, agent tokens, network isolation.

---

## Observability

Successful ingest:

```json
{"name":"telemetry-service","count":1,"agentId":"docker-agent-1","msg":"Persisted metrics"}
```

Server ready:

```json
{"name":"collector","host":"0.0.0.0","port":50051,"msg":"Collector gRPC server listening"}
```

Agent-side errors appear in agent logs (`Failed to send metrics`) with gRPC status details.

---

## Source layout

```text
apps/collector/src/
├── index.ts                          # gRPC server (main)
├── services/telemetry.service.ts     # handleMetrics
├── db/repositories/metrics.repository.ts
├── types/telemetry.types.ts          # stub
└── grpc/                             # stubs for future split
packages/proto/telemetry.proto        # shared contract
```

---

## Related docs

- [agent.md](./agent.md) — client, scheduler, collectors, timeouts
- [architecture.md](./architecture.md) — topology and planned dashboard integration
- [database.md](./database.md) — schema and migrations
