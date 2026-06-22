import { prisma } from "../../db";

import type {
  LatencyDataPoint,
  LatencyRange,
} from "../../types";
import {
  LATENCY_RANGE_MS,
  resolveLatencySource,
} from "../../types";

type LatencyRollupSource = ReturnType<typeof resolveLatencySource>;

export type LatencyRollupRow = {
  bucketStart: Date;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
};

export function formatBucketLabel(
  date: Date,
  range: LatencyRange,
): string {
  if (range === "30m" || range === "60m") {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (range === "1d") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function buildLatencySeriesFromRollups(
  rows: LatencyRollupRow[],
  range: LatencyRange,
): LatencyDataPoint[] {
  return rows.map((row) => ({
    time: formatBucketLabel(row.bucketStart, range),
    latencyMs: Math.round(row.avgLatencyMs ?? 0),
    p95Ms: row.p95LatencyMs ?? 0,
    p99Ms: row.p99LatencyMs ?? 0,
  }));
}

async function query5mRollups(
  since: Date,
  targetId?: string,
): Promise<LatencyRollupRow[]> {
  if (targetId) {
    return prisma.$queryRaw<LatencyRollupRow[]>`
      SELECT
        "bucketStart",
        "avgLatencyMs",
        "p95LatencyMs",
        "p99LatencyMs"
      FROM "HealthCheckAggregate5m"
      WHERE "bucketStart" >= ${since}
        AND "targetId" = ${targetId}
      ORDER BY "bucketStart"
    `;
  }

  return prisma.$queryRaw<LatencyRollupRow[]>`
    SELECT
      "bucketStart",
      SUM("avgLatencyMs" * "totalChecks")
        / NULLIF(SUM("totalChecks") FILTER (WHERE "avgLatencyMs" IS NOT NULL), 0)
        AS "avgLatencyMs",
      MAX("p95LatencyMs") AS "p95LatencyMs",
      MAX("p99LatencyMs") AS "p99LatencyMs"
    FROM "HealthCheckAggregate5m"
    WHERE "bucketStart" >= ${since}
    GROUP BY "bucketStart"
    ORDER BY "bucketStart"
  `;
}

async function queryHourlyRollups(
  since: Date,
  targetId?: string,
): Promise<LatencyRollupRow[]> {
  if (targetId) {
    return prisma.$queryRaw<LatencyRollupRow[]>`
      SELECT
        "bucketStart",
        "avgLatencyMs",
        "p95LatencyMs",
        "p99LatencyMs"
      FROM "HealthCheckAggregateHourly"
      WHERE "bucketStart" >= ${since}
        AND "targetId" = ${targetId}
      ORDER BY "bucketStart"
    `;
  }

  return prisma.$queryRaw<LatencyRollupRow[]>`
    SELECT
      "bucketStart",
      SUM("avgLatencyMs" * "totalChecks")
        / NULLIF(SUM("totalChecks") FILTER (WHERE "avgLatencyMs" IS NOT NULL), 0)
        AS "avgLatencyMs",
      MAX("p95LatencyMs") AS "p95LatencyMs",
      MAX("p99LatencyMs") AS "p99LatencyMs"
    FROM "HealthCheckAggregateHourly"
    WHERE "bucketStart" >= ${since}
    GROUP BY "bucketStart"
    ORDER BY "bucketStart"
  `;
}

async function queryDailyRollups(
  since: Date,
  targetId?: string,
): Promise<LatencyRollupRow[]> {
  if (targetId) {
    return prisma.$queryRaw<LatencyRollupRow[]>`
      SELECT
        "bucketStart",
        "avgLatencyMs",
        "p95LatencyMs",
        "p99LatencyMs"
      FROM "HealthCheckAggregateDaily"
      WHERE "bucketStart" >= ${since}
        AND "targetId" = ${targetId}
      ORDER BY "bucketStart"
    `;
  }

  return prisma.$queryRaw<LatencyRollupRow[]>`
    SELECT
      "bucketStart",
      SUM("avgLatencyMs" * "totalChecks")
        / NULLIF(SUM("totalChecks") FILTER (WHERE "avgLatencyMs" IS NOT NULL), 0)
        AS "avgLatencyMs",
      MAX("p95LatencyMs") AS "p95LatencyMs",
      MAX("p99LatencyMs") AS "p99LatencyMs"
    FROM "HealthCheckAggregateDaily"
    WHERE "bucketStart" >= ${since}
    GROUP BY "bucketStart"
    ORDER BY "bucketStart"
  `;
}

export async function queryLatencyRollups(
  source: LatencyRollupSource,
  since: Date,
  targetId?: string,
): Promise<LatencyRollupRow[]> {
  switch (source) {
    case "5m":
      return query5mRollups(since, targetId);
    case "hourly":
      return queryHourlyRollups(since, targetId);
    case "daily":
      return queryDailyRollups(since, targetId);
  }
}

export async function getLatencyRollupTimeSeries(
  range: LatencyRange,
  targetId?: string,
): Promise<LatencyDataPoint[]> {
  const since = new Date(Date.now() - LATENCY_RANGE_MS[range]);
  const source = resolveLatencySource(range);
  const rows = await queryLatencyRollups(source, since, targetId);
  return buildLatencySeriesFromRollups(rows, range);
}
