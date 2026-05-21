import { prisma } from "../../db";

import { queryLatencyByMinute } from "../health-checks/latency-series";

import { loadUptimePercentByTarget } from "../health-checks/uptime-percent-rollup";

import { loadLatestChecksByTarget } from "../health-checks/latest-by-target.sql";
import {
  buildUptimeSeries,
  queryUptimeByDay,
} from "../health-checks/uptime-daily-series";
import { getActiveIncidents, getRecentIncidents } from "../incidents/detect";
import { getActivityFeed } from "../activity/recent";

import { buildLatencySeries } from "../health-checks/latency-series";

import { buildTargetsWithStatus } from "../targets/list";
import { deriveSummaryStats } from "../targets/list";

import type {
  ActivityEvent,
  Incident,
  LatencyDataPoint,
  MonitoredTarget,
  SummaryStats,
  UptimeDataPoint,
} from "../../types";

import { THIRTY_DAYS_MS, SIXTY_MINUTES_MS } from "../shared/constants";

export interface OverviewPageData {
  targets: MonitoredTarget[];
  stats: SummaryStats;
  latencyData: LatencyDataPoint[];
  uptimeData: UptimeDataPoint[];
  activeIncidents: Incident[];
  resolvedIncidents: Incident[];
  activityEvents: ActivityEvent[];
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
