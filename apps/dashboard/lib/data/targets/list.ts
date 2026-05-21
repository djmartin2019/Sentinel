import { prisma } from "../../db";

import type { LatestCheck, MonitoredTarget, SummaryStats } from "../../types";
import { THIRTY_DAYS_MS } from "../shared/constants";

import { loadLatestChecksByTarget } from "../health-checks/latest-by-target.sql";
import { loadUptimePercentByTarget } from "../health-checks/uptime-percent-rollup";
import { getActiveIncidents } from "../incidents/detect";
import { mapTargetRow } from "../util/data-utils";

export function buildTargetsWithStatus(
  targets: {
    id: string;
    name: string;
    url: string;
    interval: number;
    createdAt: Date;
  }[],
  latestByTarget: Map<string, LatestCheck>,
  uptimeByTarget: Map<string, number>,
): MonitoredTarget[] {
  return targets.map((target) =>
    mapTargetRow(
      target,
      latestByTarget.get(target.id),
      uptimeByTarget.get(target.id) ?? 100,
    ),
  );
}

export function deriveSummaryStats(
  targets: MonitoredTarget[],
  activeIncidentCount: number,
): SummaryStats {
  const healthyTargets = targets.filter((t) => t.status === "UP").length;
  const withLatency = targets.filter((t) => t.status !== "DOWN");
  const avgLatencyMs =
    withLatency.length > 0
      ? Math.round(
          withLatency.reduce((sum, t) => sum + t.latencyMs, 0) /
            withLatency.length,
        )
      : 0;
  const avgUptimePercent =
    targets.length > 0
      ? parseFloat(
          (
            targets.reduce((sum, t) => sum + t.uptime, 0) / targets.length
          ).toFixed(2),
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

export async function getSummaryStats(): Promise<SummaryStats> {
  const [targets, activeIncidents] = await Promise.all([
    getTargetsWithStatus(),
    getActiveIncidents(),
  ]);
  return deriveSummaryStats(targets, activeIncidents.length);
}
