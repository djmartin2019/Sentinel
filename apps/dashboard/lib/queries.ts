import { prisma } from "./db";

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

function deriveDisplayStatus(
  prismaStatus: PrismaCheckStatus,
  latencyMs: number | null | undefined
): TargetStatus {
  if (prismaStatus === "DOWN") return "DOWN";
  if ((latencyMs ?? 0) > DEGRADED_LATENCY_MS) return "DEGRADED";
  return "UP";
}

function computeUptimePercent(checks: { status: PrismaCheckStatus }[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter((c) => c.status === "UP").length;
  return parseFloat(((up / checks.length) * 100).toFixed(2));
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

async function loadLatestChecksByTarget(): Promise<
  Map<string, { status: PrismaCheckStatus; latencyMs: number | null; checkedAt: Date }>
> {
  const checks = await prisma.healthCheck.findMany({
    orderBy: { checkedAt: "desc" },
    take: 5000,
    select: { targetId: true, status: true, latencyMs: true, checkedAt: true },
  });

  const latest = new Map<
    string,
    { status: PrismaCheckStatus; latencyMs: number | null; checkedAt: Date }
  >();
  for (const check of checks) {
    if (!latest.has(check.targetId)) {
      latest.set(check.targetId, {
        status: check.status,
        latencyMs: check.latencyMs,
        checkedAt: check.checkedAt,
      });
    }
  }
  return latest;
}

async function loadChecksInWindow(since: Date, targetId?: string) {
  return prisma.healthCheck.findMany({
    where: {
      checkedAt: { gte: since },
      ...(targetId ? { targetId } : {}),
    },
    orderBy: { checkedAt: "asc" },
    select: { targetId: true, status: true, latencyMs: true, checkedAt: true },
  });
}

function mapTargetRow(
  target: { id: string; name: string; url: string; interval: number; createdAt: Date },
  latest: { status: PrismaCheckStatus; latencyMs: number | null; checkedAt: Date } | undefined,
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

export async function getTargetsWithStatus(): Promise<MonitoredTarget[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const [targets, checks30d, latestByTarget] = await Promise.all([
    prisma.monitoredTarget.findMany({ orderBy: { name: "asc" } }),
    loadChecksInWindow(since),
    loadLatestChecksByTarget(),
  ]);

  const uptimeByTarget = new Map<string, PrismaCheckStatus[]>();
  for (const check of checks30d) {
    const list = uptimeByTarget.get(check.targetId) ?? [];
    list.push(check.status);
    uptimeByTarget.set(check.targetId, list);
  }

  return targets.map((target) => {
    const statusChecks = uptimeByTarget.get(target.id) ?? [];
    const uptime = computeUptimePercent(
      statusChecks.map((status) => ({ status }))
    );
    return mapTargetRow(target, latestByTarget.get(target.id), uptime);
  });
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

  const checks30d = await prisma.healthCheck.findMany({
    where: { targetId: id, checkedAt: { gte: since } },
    select: { status: true },
  });

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
    computeUptimePercent(checks30d)
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
  const checks = await loadChecksInWindow(since, targetId);

  const buckets = new Map<string, number[]>();
  for (const check of checks) {
    const key = formatTimeLabel(check.checkedAt);
    const list = buckets.get(key) ?? [];
    list.push(check.latencyMs ?? 0);
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

export async function getUptimeTimeSeries(
  targetId?: string
): Promise<UptimeDataPoint[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const checks = await loadChecksInWindow(since, targetId);

  const buckets = new Map<string, PrismaCheckStatus[]>();
  for (const check of checks) {
    const key = formatDateLabel(check.checkedAt);
    const list = buckets.get(key) ?? [];
    list.push(check.status);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries()).map(([date, statuses]) => ({
    date,
    uptime: computeUptimePercent(statuses.map((status) => ({ status }))),
  }));
}

async function getConsecutiveDownTargets(): Promise<
  { targetId: string; targetName: string; startedAt: Date; count: number }[]
> {
  const targets = await prisma.monitoredTarget.findMany({
    select: { id: true, name: true },
  });

  const results: {
    targetId: string;
    targetName: string;
    startedAt: Date;
    count: number;
  }[] = [];

  for (const target of targets) {
    const recent = await prisma.healthCheck.findMany({
      where: { targetId: target.id },
      orderBy: { checkedAt: "desc" },
      take: CONSECUTIVE_DOWN_FOR_INCIDENT,
      select: { status: true, checkedAt: true, errorMessage: true },
    });

    if (
      recent.length >= CONSECUTIVE_DOWN_FOR_INCIDENT &&
      recent.every((c) => c.status === "DOWN")
    ) {
      results.push({
        targetId: target.id,
        targetName: target.name,
        startedAt: recent[recent.length - 1]!.checkedAt,
        count: recent.length,
      });
    }
  }

  return results;
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

  const resolved: Incident[] = [];

  for (const target of targets) {
    const recent = await prisma.healthCheck.findMany({
      where: { targetId: target.id },
      orderBy: { checkedAt: "desc" },
      take: CONSECUTIVE_DOWN_FOR_INCIDENT + 1,
      select: { status: true, checkedAt: true },
    });

    if (recent.length < CONSECUTIVE_DOWN_FOR_INCIDENT + 1) continue;

    const latest = recent[0]!;
    const previous = recent.slice(1, CONSECUTIVE_DOWN_FOR_INCIDENT + 1);

    if (
      latest.status === "UP" &&
      previous.every((c) => c.status === "DOWN")
    ) {
      resolved.push(
        downTargetToIncident(
          {
            targetId: target.id,
            targetName: target.name,
            startedAt: previous[previous.length - 1]!.checkedAt,
            count: previous.length,
          },
          true,
          latest.checkedAt
        )
      );
    }
  }

  return resolved.sort(
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
    activeIncidents: activeIncidents.length,
    avgLatencyMs,
    avgUptimePercent,
  };
}
