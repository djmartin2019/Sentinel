# Dashboard app

The `dashboard` app is the operational UI for Sentinel: a **Next.js 16** App Router application with **Tailwind CSS v4**, reading **live data from PostgreSQL** via Prisma (no mock data, no API layer for pages yet).

## Running locally

**Recommended** — full dev stack from the monorepo root:

```bash
./dev.sh
```

This starts Postgres (Docker), runs migrations, then `pnpm dev` for checker and dashboard. Dashboard: **http://localhost:3000**

**Dashboard only** (Postgres must already be running):

```bash
cd apps/dashboard
pnpm dev
pnpm build && pnpm start   # production build locally
```

Production Docker serves the dashboard on **port 3010** (`next build` + `next start` via standalone output). See [deployment.md](./deployment.md).

---

## Folder structure

```text
apps/dashboard/
├── app/
│   ├── layout.tsx              # Root layout → AppShell
│   ├── page.tsx                # /  Overview (getOverviewPageData)
│   ├── globals.css               # @theme design tokens
│   ├── targets/page.tsx
│   ├── incidents/page.tsx
│   └── target/[id]/page.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Sidebar + main + NavigationProvider
│   │   ├── NavigationContext.tsx # Mobile drawer state
│   │   ├── Sidebar.tsx           # Nav; overlay on mobile, fixed on md+
│   │   └── Header.tsx            # Title, menu button, refresh
│   ├── dashboard/                # SummaryCards, ServicesTable, RecentActivity
│   ├── charts/                   # LatencyChart, UptimeChart (Recharts)
│   ├── incidents/                # IncidentFeed
│   └── status/                   # StatusPill, SeverityBadge
└── lib/
    ├── db.ts                     # Prisma singleton (server-only)
    ├── queries.ts                # All server-side data loading
    ├── queries/sql.ts            # Raw SQL aggregates
    ├── types.ts                  # UI types (MonitoredTarget, Incident, …)
    └── utils.ts                  # cn, formatLatency, formatRelativeTime, …
```

---

## Pages

All pages are **Server Components** with `export const dynamic = 'force-dynamic'` so data is fresh on each request.

### `/` — Overview

Single loader: `getOverviewPageData()` in one `Promise.all` (no duplicate 30-day table scans).

| Section | Data source |
|---------|-------------|
| Summary cards | Derived from targets + active incident count |
| Latency chart | Last 60 minutes, SQL + per-minute bucketing |
| Uptime chart | Last 30 days, `date_trunc('day')` aggregates |
| Services table | All targets with status, latency, 30d uptime |
| Incident feed | Derived incidents (active + 2 recent resolved) |
| Activity feed | Last 20 `HealthCheck` rows with target names |

### `/targets`

`getTargetsWithStatus()` — same target list as overview table.

### `/incidents`

`getActiveIncidents()` and `getRecentIncidents()` — computed from consecutive `DOWN` checks.

### `/target/[id]`

`getTargetById()`, `getLatencyTimeSeries(id)`, `getUptimeTimeSeries(id)`, `getRecentChecks(id)`.

---

## Status model

Prisma stores only `UP` | `DOWN`. The UI adds **DEGRADED** when the latest check is `UP` but `latencyMs` > **800ms** (`DEGRADED_LATENCY_MS` in `queries.ts`).

---

## Data layer

### `lib/db.ts`

Server-only Prisma client; reused across requests in development via global singleton.

### `lib/queries.ts`

Main query module. Public exports:

| Function | Purpose |
|----------|---------|
| `getOverviewPageData()` | Bundled overview payload |
| `getTargetsWithStatus()` | Targets + latest check + 30d uptime % |
| `getTargetById()` | Detail page + last 50 checks |
| `getLatencyTimeSeries()` | 60m chart points |
| `getUptimeTimeSeries()` | 30d daily uptime % |
| `getActiveIncidents()` / `getRecentIncidents()` | Derived incidents |
| `getActivityFeed()` | Recent events |
| `getSummaryStats()` | KPIs (calls `getTargetsWithStatus` — prefer overview bundle on `/`) |

### `lib/queries/sql.ts`

Postgres-specific aggregates (parameterized via Prisma tagged templates):

| Query | SQL technique |
|-------|----------------|
| Latest check per target | `DISTINCT ON ("targetId") … ORDER BY "checkedAt" DESC` |
| 30d uptime per target | Prisma `groupBy` on `targetId` + `status` |
| Uptime chart | `date_trunc('day', …)` + `COUNT(*) FILTER (WHERE status = 'UP')` |
| Latency chart | Rows in 60m window, bucketed by minute in JS for avg/p95/p99 |

Indexes on `HealthCheck` (`checkedAt`, `targetId + checkedAt DESC`) keep these fast as row count grows. See [database.md](./database.md).

### Incidents (derived, not a DB table)

- **Active:** last 3 checks for a target are all `DOWN`
- **Recently resolved:** latest check is `UP` and the previous 3 were `DOWN`

Severity in the UI is based on consecutive failure count (`warning` / `critical`).

---

## Layout and responsiveness

- **`AppShell`** wraps the app with `NavigationProvider`
- **Desktop:** sidebar in flow (220px, collapsible to 60px)
- **Mobile:** sidebar is a fixed overlay; hamburger in `Header` opens/closes it; backdrop + Escape to close
- **Header** and sidebar brand row share height token `--spacing-layout-header` (3.75rem)

---

## Design system

Tokens live in `app/globals.css` (`@theme`). Dark infrastructure aesthetic: `bg-bg-base`, `accent-cyan`, `status-up` / `status-down` / `status-degraded`, severity colors for incidents.

Charts use **Recharts** in client components; pages pass serialized data as props from server loaders.

---

## Environment

The dashboard reads `DATABASE_URL` from the monorepo root `.env` (via `next.config.js` / dotenv).

| Environment | `DATABASE_URL` host |
|-------------|---------------------|
| `./dev.sh` on host | `127.0.0.1:5432` |
| Docker production | `postgres:5432` (service name) |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` 16 | App Router, RSC, standalone Docker build |
| `@prisma/client` | Database access |
| `recharts` | Charts |
| `lucide-react` | Icons |
| `tailwindcss` v4 | Styling |
