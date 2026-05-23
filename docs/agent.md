# Agent app

The **agent** is a host telemetry client. It collects metrics from the machine it runs on (CPU today), batches them, and sends them to the **collector** over gRPC. It does **not** write to Postgres directly.

## Role in the stack

```text
  Host (VPS, laptop, or container)
  +---------------------------+
  |  Agent                    |
  |  collectors → scheduler   |
  |  gRPC client (persistent) |
  +-------------+-------------+
                |
                |  SendMetrics RPC (HTTP/2)
                v
  +-------------+-------------+
  |  Collector :50051         |
  +---------------------------+
```

This is a **separate pipeline** from uptime monitoring:

| Pipeline | Transport | Data |
|----------|-----------|------|
| Checker → Postgres | HTTP checks + Prisma | `HealthCheck` (URL up/down) |
| Agent → Collector → Postgres | gRPC | `TelemetryMetric` (CPU %, etc.) |

The dashboard does not read `TelemetryMetric` yet (heatmap is still a placeholder).

---

## How it works

```text
index.ts
  ├── load root .env (local dev)
  ├── createTelemetryClient(collectorUrl)   # once at startup
  └── startMetricsScheduler(client, collectors, intervalMs)
        ├── tick() immediately
        └── setInterval(tick, intervalMs)

tick()  (scheduler.ts)
  ├── withTimeout( entire tick, TICK_TIMEOUT_MS )
  ├── Promise.all(collectors)  →  MetricPayload[]
  └── sendMetrics(client, metrics)  →  gRPC SendMetrics

sendMetrics()  (grpc/telemetry.client.ts)
  └── client.SendMetrics({ metrics }, { deadline }, callback)
```

### Entry point — `src/index.ts`

- Loads monorepo root `.env` when present (same pattern as checker).
- Creates **one** gRPC client at startup and reuses it on every tick.
- Registers `SIGTERM` handler: stops scheduler and closes client (Docker shutdown).

### Scheduler — `src/scheduler/scheduler.ts`

- Runs an immediate tick, then repeats every `METRICS_INTERVAL_MS` (default **10s**).
- **`running` guard:** skips a tick if the previous one is still in progress (prevents overlap).
- **`withTimeout`:** fails the whole tick if collect + send exceeds `TICK_TIMEOUT_MS` (default **8s**), so a hang cannot lock the scheduler forever.
- Errors are logged via `onError`; the next tick still runs.

### gRPC client — `src/grpc/telemetry.client.ts`

- Loads [`packages/proto/telemetry.proto`](../packages/proto/telemetry.proto) **once** at module import (not per tick).
- **`createTelemetryClient(url)`** — constructs client with keepalive channel options.
- **`sendMetrics(client, metrics)`** — wraps the callback-style RPC in a `Promise`.
- **`{ deadline }`** on each call — gRPC fails with `DEADLINE_EXCEEDED` after `GRPC_RPC_TIMEOUT_MS` (default **5s**).

**Why a persistent client?** gRPC reuses a single HTTP/2 connection. Creating a new client every tick would re-parse the proto and open new channels unnecessarily.

### Collectors — `src/collectors/*.collector.ts`

Each collector is an async function returning a `MetricPayload`:

```ts
{
  agentId: string;
  metricType: string;   // e.g. "cpu"
  value: number;
  timestamp: number;    // Date.now()
}
```

| File | Status |
|------|--------|
| `cpu.collector.ts` | **Implemented** — `systeminformation` current load % |
| `memory.collector.ts` | Stub |
| `disk.collector.ts` | Stub |
| `docker.collector.ts` | Stub |
| `services.collector.ts` | Stub |

`index.ts` registers `[collectCpuMetric]` only. To add metrics, implement a collector and append it to the array — one `SendMetrics` batch per tick.

---

## gRPC contract (client view)

Defined in [`packages/proto/telemetry.proto`](../packages/proto/telemetry.proto):

```protobuf
rpc SendMetrics (MetricsRequest) returns (MetricsResponse);

message MetricsRequest {
  repeated Metric metrics = 1;
}
message MetricsResponse {
  bool success = 1;
}
```

The agent sends `{ metrics: MetricPayload[] }`. The `{ deadline }` argument is **not** in the proto — it is transport metadata (`grpc.CallOptions`), not business data.

See [collector.md](./collector.md) for the server side.

---

## Environment variables

From root [`.env.example`](../.env.example) (copy to `.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_ID` | `local-agent` | Stored on each metric row; identifies this agent |
| `COLLECTOR_GRPC_URL` | `127.0.0.1:50051` | Collector address (`host:port`, no `http://`) |
| `METRICS_INTERVAL_MS` | `10000` | Time between ticks |
| `GRPC_RPC_TIMEOUT_MS` | `5000` | Per-RPC gRPC deadline |
| `TICK_TIMEOUT_MS` | `8000` | Max time for collect + send in one tick |
| `LOG_LEVEL` | `info` | pino log level |

**Timing rule of thumb:** `GRPC_RPC_TIMEOUT_MS` < `TICK_TIMEOUT_MS` < `METRICS_INTERVAL_MS`.

**Docker vs host:**

| Where agent runs | `COLLECTOR_GRPC_URL` |
|------------------|----------------------|
| Docker Compose (`telemetry` profile) | `collector:50051` (service DNS name) |
| Host (`pnpm dev`) with collector in Docker | `127.0.0.1:50051` |

---

## Running locally

### Option A — full stack in Docker (easiest)

From monorepo root:

```bash
cp .env.example .env
docker compose --profile telemetry up -d --build
docker compose --profile telemetry logs -f agent collector
```

Expect agent logs: `"Metrics sent"`. Collector logs: `"Persisted metrics"`.

Verify rows:

```bash
docker compose exec postgres psql -U sentinel -d sentinel \
  -c 'SELECT "agentId", "metricType", value, "recordedAt" FROM "TelemetryMetric" ORDER BY "recordedAt" DESC LIMIT 5;'
```

### Option B — agent on host, collector in Docker

```bash
docker compose --profile telemetry up -d postgres collector
cd apps/agent
pnpm dev
```

Ensure root `.env` has `COLLECTOR_GRPC_URL=127.0.0.1:50051`.

### Production build

```bash
cd apps/agent
pnpm build    # tsc → dist/
pnpm start    # node dist/index.js
```

Docker image: [`apps/agent/Dockerfile`](../apps/agent/Dockerfile) — no published ports (client only).

---

## Timeouts and failure modes

| Failure | What happens |
|---------|----------------|
| Collector down | RPC errors logged; next tick retries |
| RPC hangs | `DEADLINE_EXCEEDED` after `GRPC_RPC_TIMEOUT_MS` |
| Collector slow on DB | Agent times out; collector may still finish server-side |
| `collectCpuMetric()` hangs | `tick timed out after …ms` from `withTimeout` |
| Tick longer than interval | Next tick skipped (`running` guard) until current finishes or times out |

---

## Source layout

```text
apps/agent/src/
├── index.ts                 # startup, env, client, scheduler
├── scheduler/scheduler.ts   # interval loop + tick timeout
├── grpc/telemetry.client.ts # proto load, client, sendMetrics
├── collectors/              # one file per metric type
├── types/telemetry.types.ts
└── utils/                   # shared helpers (stubs)
```

---

## Related docs

- [collector.md](./collector.md) — gRPC server and DB persistence
- [architecture.md](./architecture.md) — how telemetry fits with checker/dashboard
- [database.md](./database.md) — `TelemetryMetric` table and migration
