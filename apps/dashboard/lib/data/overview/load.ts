import { prisma } from "../../db";

import { getLatencyRollupTimeSeries } from "../health-checks/latency-rollup-series";

import { loadUptimePercentByTarget } from "../health-checks/uptime-percent-rollup";

import { loadLatestChecksByTarget } from "../health-checks/latest-by-target.sql";
import {
  buildUptimeSeries,
  queryUptimeByDay,
} from "../health-checks/uptime-daily-series";
import { getActiveIncidents, getRecentIncidents } from "../incidents/detect";
import { getActivityFeed } from "../activity/recent";

import { buildTargetsWithStatus } from "../targets/list";
import { deriveSummaryStats } from "../targets/list";

import type {
  ActivityEvent,
  Incident,
  LatencyDataPoint,
  LatencyRange,
  MonitoredTarget,
  SummaryStats,
  UptimeDataPoint,
} from "../../types";

import { THIRTY_DAYS_MS } from "../shared/constants";

export interface OverviewPageData {
  targets: MonitoredTarget[];
  stats: SummaryStats;
  latencyData: LatencyDataPoint[];
  uptimeData: UptimeDataPoint[];
  activeIncidents: Incident[];
  resolvedIncidents: Incident[];
  activityEvents: ActivityEvent[];
}

export async function getOverviewPageData(
  targetId?: string,
  range: LatencyRange = "60m",
): Promise<OverviewPageData> {
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    targetRows,
    latestByTarget,
    uptimeByTarget,
    latencyData,
    uptimeRows,
    activeIncidents,
    resolvedIncidents,
    activityEvents,
  ] = await Promise.all([
    prisma.monitoredTarget.findMany({ orderBy: { name: "asc" } }),
    loadLatestChecksByTarget(),
    loadUptimePercentByTarget(since30d),
    getLatencyRollupTimeSeries(range, targetId),
    queryUptimeByDay(since30d, targetId),
    getActiveIncidents(),
    getRecentIncidents(),
    getActivityFeed(),
  ]);

  const uptimeData = buildUptimeSeries(uptimeRows);

  const targets = buildTargetsWithStatus(
    targetRows,
    latestByTarget,
    uptimeByTarget,
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
