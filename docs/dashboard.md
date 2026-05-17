# Dashboard App

The `dashboard` app is the operational frontend for Sentinel. It is a **Next.js 16 App Router** application styled with **Tailwind CSS v4** and built exclusively for dark-mode infrastructure monitoring. It currently runs on static/server-rendered mock data and is structured to be swapped for real API calls without restructuring anything.

## Running locally

From the monorepo root (preferred — starts all services together):

```bash
./dev.sh
```

Or from the app directory directly:

```bash
cd apps/dashboard
pnpm dev        # starts on http://localhost:3000
pnpm build      # production build
pnpm start      # serve the production build
```

---

## Folder structure

```
apps/dashboard/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (sidebar + main wrapper)
│   ├── page.tsx                  # /  →  Overview dashboard
│   ├── globals.css               # Tailwind v4 theme + base styles
│   ├── targets/
│   │   └── page.tsx              # /targets  →  All monitored endpoints
│   ├── incidents/
│   │   └── page.tsx              # /incidents  →  Active + resolved incidents
│   └── target/[id]/
│       └── page.tsx              # /target/:id  →  Single target detail
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Collapsible left nav (client component)
│   │   └── Header.tsx            # Sticky page header with clock + refresh
│   ├── dashboard/
│   │   ├── SummaryCards.tsx      # 4-card KPI row
│   │   ├── ServicesTable.tsx     # Dense services status table
│   │   └── RecentActivity.tsx    # Timeline event feed
│   ├── charts/
│   │   ├── LatencyChart.tsx      # Line chart: avg / p95 / p99 latency
│   │   └── UptimeChart.tsx       # Area chart: 30d uptime composite
│   ├── incidents/
│   │   └── IncidentFeed.tsx      # Incident cards with severity + resolved state
│   └── status/
│       └── StatusPill.tsx        # UP/DOWN/DEGRADED pills + SeverityBadge
│
└── lib/
    ├── types.ts                  # All shared TypeScript interfaces
    ├── mock-data.ts              # Realistic sample data for all pages
    └── utils.ts                  # cn(), formatLatency(), formatRelativeTime(), etc.
```

---

## Pages

### `/` — Overview

The main operational dashboard. Composed of six sections laid out on a responsive grid:

1. **Summary cards** — Total targets / Healthy / Active incidents / Avg latency
2. **Latency chart** — Last 60 minutes, avg + p95 + p99 lines
3. **Uptime chart** — Last 30 days, composite area chart
4. **Services table** — All targets with status, latency, uptime bar, region
5. **Incident feed** — Active and recently resolved incidents
6. **Activity feed** — Timestamped event stream

### `/targets` — Targets

Full-width table of every `MonitoredTarget` showing name, URL, status pill, latency, uptime progress bar, check interval, region, and last check time. Each row links to the detail page on hover.

### `/incidents` — Incidents

Split into **Active** (highlighted with severity border) and **Resolved** sections. Active critical incidents have a red left-border accent. Each card shows severity badge, description, affected target, elapsed time, and resolution time if applicable.

### `/target/[id]` — Target Detail

Fetches target by `id` param (currently from mock data). Shows:
- Stat grid: current status, latency, 30d uptime, interval, region, last check
- Tag pills
- Latency and uptime charts (same components reused from the overview)
- Recent check history table with per-check status, HTTP code, latency, and error

---

## Components

### `Sidebar`

**Client component** — requires `usePathname` for active route highlighting and `useState` for collapse state.

- Expands to 220px, collapses to 60px with a smooth CSS transition
- Shows icon tooltips when collapsed
- Animated green pulse dot at the bottom reflects system status
- Collapse toggle button floats on the right edge

### `Header`

**Server component** — renders a sticky top bar per page. Accepts `title` and `subtitle` props. Displays a live timestamp, a refresh button, and a notification bell. The notification indicator (red dot) is currently hardcoded and will be wired to real incident data.

### `StatusPill`

Renders a monospace badge in one of three styles:

| Status | Color |
|---|---|
| `UP` | Emerald green |
| `DOWN` | Red |
| `DEGRADED` | Amber |

Accepts an optional `pulse` prop that animates the dot for active DOWN/DEGRADED states. Also exports `SeverityBadge` for incident severity (`critical` / `warning` / `info`).

### `SummaryCards`

Four stat cards arranged in a 2-col (mobile) → 4-col (desktop) grid. Each card accepts an `accent` prop (`cyan` | `green` | `red` | `amber`) that controls icon color, value color, and hover glow. Trend indicators show direction and context below the metric.

### `ServicesTable` / Targets table

Dense operational table. Uptime is visualized as a thin inline progress bar colored by threshold (green >99%, amber >95%, red below). Latency is colored by `getLatencyColor()`. Rows reveal a link icon on hover.

### `LatencyChart`

**Client component** (`'use client'`). Recharts `LineChart` with three series:
- `latencyMs` — average latency (cyan)
- `p95Ms` — 95th percentile (blue, dashed)
- `p99Ms` — 99th percentile (purple, dashed)

Custom tooltip renders in the same dark card style as the rest of the UI.

### `UptimeChart`

**Client component**. Recharts `AreaChart` with a linear gradient fill from `#10b981` (green) to transparent. Y-axis domain is fixed to `[90, 100]` so small dips are visible. Custom tooltip shows the exact uptime percentage to three decimal places.

### `IncidentFeed`

Splits incidents into active and resolved. Critical incidents render with a `border-l-2 border-severity-critical` left accent. Resolved incidents show a green RESOLVED badge and the resolution time.

### `RecentActivity`

Vertical timeline with a connecting line down the left edge. Each event has a circular icon (`CheckCircle`, `AlertTriangle`, `ArrowUpCircle`, `Bell`) and a colored status dot. Timestamps are rendered as relative time (e.g. `12m ago`).

---

## Design system

All design tokens are defined in `app/globals.css` using Tailwind v4's `@theme` directive. They become Tailwind utility classes automatically — no `tailwind.config.js` needed.

### Color tokens

| Token | Hex | Usage |
|---|---|---|
| `bg-bg-base` | `#070b12` | Page background |
| `bg-bg-surface` | `#0d1421` | Sidebar, header |
| `bg-bg-card` | `#111827` | Cards, tables |
| `bg-bg-elevated` | `#172033` | Hover states, tooltips |
| `border-border` | `#1e2d40` | All borders |
| `text-accent-cyan` | `#22d3ee` | Primary accent, active nav |
| `text-accent-blue` | `#60a5fa` | Secondary accent, chart lines |
| `text-accent-purple` | `#a78bfa` | Tertiary accent, p99 line |
| `text-status-up` | `#10b981` | Healthy / UP |
| `text-status-down` | `#ef4444` | Unhealthy / DOWN |
| `text-status-degraded` | `#f59e0b` | Degraded / slow |
| `text-severity-critical` | `#dc2626` | Critical incidents |
| `text-severity-warning` | `#d97706` | Warning incidents |
| `text-severity-info` | `#0ea5e9` | Info incidents |
| `text-text-primary` | `#e2e8f0` | Main text |
| `text-text-secondary` | `#94a3b8` | Supporting text |
| `text-text-muted` | `#475569` | Labels, metadata |

### Typography conventions

- **Labels / column headers**: `text-[10px] uppercase tracking-widest font-medium`
- **Metric values**: `font-mono tabular-nums` (ensures numbers don't shift width)
- **Code / IDs / times**: `font-mono text-xs`
- **Body**: `-apple-system / Inter` via system font stack

---

## Data layer

### `lib/types.ts`

Shared interfaces for `MonitoredTarget`, `HealthCheck`, `Incident`, `LatencyDataPoint`, `UptimeDataPoint`, and `ActivityEvent`. These mirror the Prisma schema in the backend so swapping mock data for real API responses requires no type changes.

### `lib/mock-data.ts`

Exports:
- `targets` — 8 realistic services (`api-gateway`, `auth-service`, `postgres-primary`, `vercel-edge`, `docker-host-01`, `telemetry-collector`, `redis-cache`, `worker-queue`)
- `incidents` — 4 incidents (2 active, 2 resolved) with realistic descriptions
- `latencyData` — 60 minutes of latency data with two programmatic spikes
- `uptimeData` — 30 days of uptime data with two programmatic dips
- `activityEvents` — 8 recent events across different types
- `summaryStats` — pre-computed aggregates used by `SummaryCards`

### `lib/utils.ts`

| Function | Description |
|---|---|
| `cn(...inputs)` | Merges Tailwind classes via `clsx` + `tailwind-merge` |
| `formatLatency(ms)` | `42` → `"42ms"`, `1240` → `"1.24s"` |
| `formatUptime(pct)` | `99.98` → `"99.98%"` |
| `formatRelativeTime(iso)` | ISO string → `"12s ago"`, `"4m ago"`, `"2h ago"` |
| `getStatusColor(status)` | Returns Tailwind class for `TargetStatus` |
| `getSeverityColor(severity)` | Returns Tailwind class for `IncidentSeverity` |
| `getLatencyColor(ms)` | Green <200ms, amber <800ms, red otherwise |

---

## Connecting to real data

The mock data layer is isolated entirely in `lib/mock-data.ts`. To connect a real API:

1. Replace imports from `@/lib/mock-data` in each page with `fetch()` calls or a data-fetching library — pages are Server Components by default so `async/await` works directly.
2. The types in `lib/types.ts` already match the Prisma schema, so API responses from the backend should fit with minimal adjustment.
3. Chart components are Client Components (`'use client'`) and receive data as props, so they need no changes — pass the fetched data down from the Server Component page.

## Dependencies

| Package | Purpose |
|---|---|
| `next` 16 | App Router, server components, routing |
| `react` 19 | UI rendering |
| `tailwindcss` v4 | Utility-first CSS, `@theme` for design tokens |
| `recharts` | Latency and uptime charts |
| `lucide-react` | Icon library |
| `clsx` | Conditional class joining |
| `tailwind-merge` | Deduplicating conflicting Tailwind classes |
