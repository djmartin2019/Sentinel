# Checker App

The `checker` app is a lightweight background worker that periodically pings every monitored URL stored in the database and records whether it is up or down.

## How it works

```
index.ts
  └── startScheduler()          runs immediately, then every 30 s
        └── runChecks()         fetches all MonitoredTargets from Postgres
              └── httpCheck()   fires an HTTP GET at each URL
              └── prisma.healthCheck.create()  writes the result back to the DB
```

### 1. Entry point — `src/index.ts`

Loads environment variables from the monorepo root `.env` (so `DATABASE_URL` resolves correctly regardless of which directory you launch from), then calls `startScheduler()`.

### 2. Scheduler — `src/scheduler/scheduler.ts`

Runs `runChecks()` once immediately on startup, then schedules the same function on a fixed **30-second interval** using `setInterval`.

### 3. Check service — `src/services/checker.service.ts`

For each check cycle:

1. Fetches all rows from the `MonitoredTarget` table.
2. Calls `httpCheck(target.url)` for each target.
3. Persists a new `HealthCheck` row with the result.
4. Logs the outcome via the structured logger.

### 4. HTTP check — `src/checks/httpCheck.ts`

Makes a `GET` request using `axios` with a **5-second timeout**. Returns a `CheckResult`:

| Field | Description |
|---|---|
| `status` | `"UP"` if the response status is 2xx–3xx, `"DOWN"` otherwise |
| `statusCode` | The raw HTTP status code (omitted on network errors) |
| `latencyMs` | Round-trip time in milliseconds |
| `errorMessage` | Populated only when the request throws (timeout, DNS failure, etc.) |

If the request throws for any reason (connection refused, timeout, non-2xx that axios treats as an error), the check is marked `DOWN` and the error message is captured.

### 5. Database — Prisma + PostgreSQL

Two models live in `prisma/schema.prisma`:

**`MonitoredTarget`** — the list of URLs to watch.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `name` | `String` | Human-readable label |
| `url` | `String` | Full URL that gets pinged |
| `interval` | `Int` | Stored value (default 30 s); the scheduler currently uses a fixed 30 s global interval |
| `createdAt` | `DateTime` | Auto-set on creation |

**`HealthCheck`** — one row per check execution.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `targetId` | `String` | FK → `MonitoredTarget.id` |
| `status` | `CheckStatus` | `UP` or `DOWN` |
| `statusCode` | `Int?` | HTTP status code, if available |
| `latencyMs` | `Int?` | Round-trip time in ms |
| `errorMessage` | `String?` | Error detail on failure |
| `checkedAt` | `DateTime` | Auto-set to `now()` |

### 6. Logger — `src/logger/logger.ts`

Uses [pino](https://getpino.io) with the `pino-pretty` transport for human-readable output in development.

## Running locally

From the **monorepo root**, generate the Prisma client (only needed after install or schema changes):

```bash
pnpm db:generate
```

Then start the checker:

```bash
cd apps/checker
pnpm dev
```

`pnpm dev` runs `tsx watch src/index.ts`, so the process restarts automatically on file changes.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string — set in the root `.env` |

Example `.env`:

```
DATABASE_URL="postgresql://sentinel:sentinel@127.0.0.1:5432/sentinel?schema=public"
```
