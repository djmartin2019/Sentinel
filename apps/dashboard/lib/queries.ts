import { prisma } from "./db";
import {
  queryLatestChecksByTarget,
  queryLatencyByMinute,
  queryUptimeByDay,
} from "./queries/sql";

type PrismaCheckStatus = "UP" | "DOWN";
import type {
  ActivityEvent,
  HealthCheck,
  Incident,
  LatencyDataPoint,
  MonitoredTarget,
  TargetStatus,
  UptimeDataPoint,
} from "./types";

const DEGRADED_LATENCY_MS = 800;
const CONSECUTIVE_DOWN_FOR_INCIDENT = 3;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export interface SummaryStats {
  totalTargets: number;
  healthyTargets: number;
  activeIncidents: number;
  avgLatencyMs: number;
  avgUptimePercent: number;
}

export interface OverviewPageData {
  targets: MonitoredTarget[];
  stats: SummaryStats;
  latencyData: LatencyDataPoint[];
  uptimeData: UptimeDataPoint[];
  activeIncidents: Incident[];
  resolvedIncidents: Incident[];
  activityEvents: ActivityEvent[];
}

type LatestCheck = {
  status: PrismaCheckStatus;
  latencyMs: number | null;
  checkedAt: Date;
};

function deriveDisplayStatus(
  prismaStatus: PrismaCheckStatus,
  latencyMs: number | null | undefined
): TargetStatus {
  if (prismaStatus === "DOWN") return "DOWN";
  if ((latencyMs ?? 0) > DEGRADED_LATENCY_MS) return "DEGRADED";
  return "UP";
}

function computeUptimePercentFromCounts(up: number, total: number): number {
  if (total === 0) return 100;
  return parseFloat(((up / total) * 100).toFixed(2));
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1)
  );
  return sorted[idx]!;
}

async function loadLatestChecksByTarget(): Promise<Map<string, LatestCheck>> {
  const rows = await queryLatestChecksByTarget();
  const latest = new Map<string, LatestCheck>();
  for (const row of rows) {
    latest.set(row.targetId, {
      status: row.status,
      latencyMs: row.latencyMs,
      checkedAt: row.checkedAt,
    });
  }
  return latest;
}

function uptimeMapFromGroupBy(
  groups: { targetId: string; status: PrismaCheckStatus; _count: { _all: number } }[]
): Map<string, number> {
  const totals = new Map<string, { up: number; total: number }>();
  for (const row of groups) {
    const entry = totals.get(row.targetId) ?? { up: 0, total: 0 };
    const count = row._count._all;
    entry.total += count;
    if (row.status === "UP") entry.up += count;
    totals.set(row.targetId, entry);
  }

  const uptime = new Map<string, number>();
  for (const [targetId, { up, total }] of totals) {
    uptime.set(targetId, computeUptimePercentFromCounts(up, total));
  }
  return uptime;
}

async function loadUptimePercentByTarget(
  since: Date
): Promise<Map<string, number>> {
  const groups = await prisma.healthCheck.groupBy({
    by: ["targetId", "status"],
    where: { checkedAt: { gte: since } },
    _count: { _all: true },
  });
  return uptimeMapFromGroupBy(groups);
}

async function loadUptimePercentForTarget(
  since: Date,
  targetId: string
): Promise<number> {
  const groups = await prisma.healthCheck.groupBy({
    by: ["status"],
    where: { checkedAt: { gte: since }, targetId },
    _count: { _all: true },
  });

  let up = 0;
  let total = 0;
  for (const row of groups) {
    const count = row._count._all;
    total += count;
    if (row.status === "UP") up += count;
  }
  return computeUptimePercentFromCounts(up, total);
}

function mapTargetRow(
  target: { id: string; name: string; url: string; interval: number; createdAt: Date },
  latest: LatestCheck | undefined,
  uptime: number
): MonitoredTarget {
  const latencyMs = latest?.latencyMs ?? 0;
  const status = latest
    ? deriveDisplayStatus(latest.status, latest.latencyMs)
    : "UP";

  return {
    id: target.id,
    name: target.name,
    url: target.url,
    interval: target.interval,
    status,
    latencyMs,
    uptime,
    lastChecked: (latest?.checkedAt ?? target.createdAt).toISOString(),
    region: "us-east-1",
    createdAt: target.createdAt.toISOString(),
    tags: [],
  };
}

function buildTargetsWithStatus(
  targets: { id: string; name: string; url: string; interval: number; createdAt: Date }[],
  latestByTarget: Map<string, LatestCheck>,
  uptimeByTarget: Map<string, number>
): MonitoredTarget[] {
  return targets.map((target) =>
    mapTargetRow(
      target,
      latestByTarget.get(target.id),
      uptimeByTarget.get(target.id) ?? 100
    )
  );
}

function deriveSummaryStats(
  targets: MonitoredTarget[],
  activeIncidentCount: number
): SummaryStats {
  const healthyTargets = targets.filter((t) => t.status === "UP").length;
  const withLatency = targets.filter((t) => t.status !== "DOWN");
  const avgLatencyMs =
    withLatency.length > 0
      ? Math.round(
          withLatency.reduce((sum, t) => sum + t.latencyMs, 0) / withLatency.length
        )
      : 0;
  const avgUptimePercent =
    targets.length > 0
      ? parseFloat(
          (
            targets.reduce((sum, t) => sum + t.uptime, 0) / targets.length
          ).toFixed(2)
        )
      : 100;

  return {
    totalTargets: targets.length,
    healthyTargets,
    activeIncidents: activeIncidentCount,
    avgLatencyMs,
    avgUptimePercent,
  };
}

export async function getTargetsWithStatus(): Promise<MonitoredTarget[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const [targets, latestByTarget, uptimeByTarget] = await Promise.all([
    prisma.monitoredTarget.findMany({ orderBy: { name: "asc" } }),
    loadLatestChecksByTarget(),
    loadUptimePercentByTarget(since),
  ]);

  return buildTargetsWithStatus(targets, latestByTarget, uptimeByTarget);
}

export async function getTargetById(
  id: string
): Promise<(MonitoredTarget & { checks: HealthCheck[] }) | null> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const target = await prisma.monitoredTarget.findUnique({
    where: { id },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!target) return null;

  const uptime = await loadUptimePercentForTarget(since, id);
  const latest = target.checks[0];
  const mapped = mapTargetRow(
    target,
    latest
      ? {
          status: latest.status,
          latencyMs: latest.latencyMs,
          checkedAt: latest.checkedAt,
        }
      : undefined,
    uptime
  );

  return {
    ...mapped,
    checks: target.checks.map((c) => ({
      id: c.id,
      targetId: c.targetId,
      status: c.status,
      statusCode: c.statusCode ?? undefined,
      latencyMs: c.latencyMs ?? undefined,
      errorMessage: c.errorMessage ?? undefined,
      checkedAt: c.checkedAt.toISOString(),
    })),
  };
}

export async function getRecentChecks(targetId: string): Promise<HealthCheck[]> {
  const checks = await prisma.healthCheck.findMany({
    where: { targetId },
    orderBy: { checkedAt: "desc" },
    take: 50,
  });

  return checks.map((c) => ({
    id: c.id,
    targetId: c.targetId,
    status: c.status,
    statusCode: c.statusCode ?? undefined,
    latencyMs: c.latencyMs ?? undefined,
    errorMessage: c.errorMessage ?? undefined,
    checkedAt: c.checkedAt.toISOString(),
  }));
}

export async function getLatencyTimeSeries(
  targetId?: string
): Promise<LatencyDataPoint[]> {
  const since = new Date(Date.now() - SIXTY_MINUTES_MS);
  const rows = await queryLatencyByMinute(since, targetId);
  return buildLatencySeries(rows);
}

export async function getUptimeTimeSeries(
  targetId?: string
): Promise<UptimeDataPoint[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const rows = await queryUptimeByDay(since, targetId);
  return buildUptimeSeries(rows);
}

async function getConsecutiveDownTargets(): Promise<
  { targetId: string; targetName: string; startedAt: Date; count: number }[]
> {
  const targets = await prisma.monitoredTarget.findMany({
    select: { id: true, name: true },
  });

  const perTarget = await Promise.all(
    targets.map(async (target) => {
      const recent = await prisma.healthCheck.findMany({
        where: { targetId: target.id },
        orderBy: { checkedAt: "desc" },
        take: CONSECUTIVE_DOWN_FOR_INCIDENT,
        select: { status: true, checkedAt: true },
      });

      if (
        recent.length >= CONSECUTIVE_DOWN_FOR_INCIDENT &&
        recent.every((c) => c.status === "DOWN")
      ) {
        return {
          targetId: target.id,
          targetName: target.name,
          startedAt: recent[recent.length - 1]!.checkedAt,
          count: recent.length,
        };
      }
      return null;
    })
  );

  return perTarget.filter(
    (row): row is NonNullable<typeof row> => row !== null
  );
}

function downTargetToIncident(
  row: { targetId: string; targetName: string; startedAt: Date; count: number },
  resolved: boolean,
  resolvedAt?: Date
): Incident {
  const severity =
    row.count >= 5 ? "critical" : row.count >= 3 ? "warning" : "info";

  return {
    id: `inc_${row.targetId}_${resolved ? "resolved" : "active"}`,
    title: `${row.targetName} unreachable`,
    severity,
    targetId: row.targetId,
    targetName: row.targetName,
    startedAt: row.startedAt.toISOString(),
    resolvedAt: resolvedAt?.toISOString(),
    resolved,
    description: `Health check failed ${row.count}+ consecutive times. Endpoint may be down or timing out.`,
  };
}

export async function getActiveIncidents(): Promise<Incident[]> {
  const down = await getConsecutiveDownTargets();
  return down.map((row) => downTargetToIncident(row, false));
}

export async function getRecentIncidents(): Promise<Incident[]> {
  const targets = await prisma.monitoredTarget.findMany({
    select: { id: true, name: true },
  });

  const perTarget = await Promise.all(
    targets.map(async (target) => {
      const recent = await prisma.healthCheck.findMany({
        where: { targetId: target.id },
        orderBy: { checkedAt: "desc" },
        take: CONSECUTIVE_DOWN_FOR_INCIDENT + 1,
        select: { status: true, checkedAt: true },
      });

      if (recent.length < CONSECUTIVE_DOWN_FOR_INCIDENT + 1) return null;

      const latest = recent[0]!;
      const previous = recent.slice(1, CONSECUTIVE_DOWN_FOR_INCIDENT + 1);

      if (
        latest.status === "UP" &&
        previous.every((c) => c.status === "DOWN")
      ) {
        return downTargetToIncident(
          {
            targetId: target.id,
            targetName: target.name,
            startedAt: previous[previous.length - 1]!.checkedAt,
            count: previous.length,
          },
          true,
          latest.checkedAt
        );
      }
      return null;
    })
  );

  return perTarget
    .filter((inc): inc is Incident => inc !== null)
    .sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.startedAt).getTime() -
        new Date(a.resolvedAt ?? a.startedAt).getTime()
    );
}

export async function getActivityFeed(): Promise<ActivityEvent[]> {
  const checks = await prisma.healthCheck.findMany({
    orderBy: { checkedAt: "desc" },
    take: 20,
    include: { target: { select: { name: true } } },
  });

  return checks.map((check) => {
    const displayStatus = deriveDisplayStatus(check.status, check.latencyMs);
    const isDown = check.status === "DOWN";
    const isSlow = displayStatus === "DEGRADED";

    let type: ActivityEvent["type"] = "check";
    if (isDown) type = "incident";
    else if (isSlow) type = "alert";

    let message: string;
    if (isDown) {
      message = check.errorMessage ?? "Health check failed";
    } else if (isSlow) {
      message = `Elevated latency — ${check.latencyMs}ms`;
    } else {
      message = `Health check passed — ${check.latencyMs ?? 0}ms`;
    }

    return {
      id: check.id,
      type,
      message,
      targetName: check.target.name,
      timestamp: check.checkedAt.toISOString(),
      status: displayStatus,
    };
  });
}

export async function getSummaryStats(): Promise<SummaryStats> {
  const [targets, activeIncidents] = await Promise.all([
    getTargetsWithStatus(),
    getActiveIncidents(),
  ]);
  return deriveSummaryStats(targets, activeIncidents.length);
}

function buildLatencySeries(
  rows: Awaited<ReturnType<typeof queryLatencyByMinute>>
): LatencyDataPoint[] {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = formatTimeLabel(row.minute);
    const list = buckets.get(key) ?? [];
    list.push(row.latencyMs ?? 0);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries()).map(([time, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return {
      time,
      latencyMs: Math.round(avg),
      p95Ms: Math.round(percentile(sorted, 0.95)),
      p99Ms: Math.round(percentile(sorted, 0.99)),
    };
  });
}

function buildUptimeSeries(
  rows: Awaited<ReturnType<typeof queryUptimeByDay>>
): UptimeDataPoint[] {
  return rows.map((row) => {
    const up = Number(row.up_count);
    const total = Number(row.total);
    return {
      date: formatDateLabel(row.day),
      uptime: computeUptimePercentFromCounts(up, total),
    };
  });
}

export async function getOverviewPageData(): Promise<OverviewPageData> {
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);
  const since60m = new Date(Date.now() - SIXTY_MINUTES_MS);

  const [
    targetRows,
    latestByTarget,
    uptimeByTarget,
    latencyRows,
    uptimeRows,
    activeIncidents,
    resolvedIncidents,
    activityEvents,
  ] = await Promise.all([
    prisma.monitoredTarget.findMany({ orderBy: { name: "asc" } }),
    loadLatestChecksByTarget(),
    loadUptimePercentByTarget(since30d),
    queryLatencyByMinute(since60m),
    queryUptimeByDay(since30d),
    getActiveIncidents(),
    getRecentIncidents(),
    getActivityFeed(),
  ]);

  const latencyData = buildLatencySeries(latencyRows);
  const uptimeData = buildUptimeSeries(uptimeRows);

  const targets = buildTargetsWithStatus(
    targetRows,
    latestByTarget,
    uptimeByTarget
  );
  const stats = deriveSummaryStats(targets, activeIncidents.length);

  return {
    targets,
    stats,
    latencyData,
    uptimeData,
    activeIncidents,
    resolvedIncidents,
    activityEvents,
  };
}
