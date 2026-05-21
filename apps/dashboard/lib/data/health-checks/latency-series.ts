import { prisma } from "../../db";

import type { LatencyMintueRow, LatencyDataPoint } from "../../types";

import { SIXTY_MINUTES_MS } from "../shared/constants";

import { formatTimeLabel, percentile } from "../util/data-utils";

export async function queryLatencyByMinute(
  since: Date,
  targetId?: string,
): Promise<LatencyMintueRow[]> {
  if (targetId) {
    return prisma.$queryRaw<LatencyMintueRow[]>`
            SELECT
                date_trunc('minute', "checkedAt") AS minute,
                "latencyMs"
            FROM "HealthCheck"
            WHERE "checkedAt" >= ${since}
                AND "targetId" = ${targetId}
                AND "latencyMs" IS NOT NULL
            ORDER BY 1
        `;
  }

  return prisma.$queryRaw<LatencyMintueRow[]>`
        SELECT
            date_trunc('minute', "checkedAt") AS minute,
            "latencyMs"
        FROM "HealthCheck"
        WHERE "checkedAt" >= ${since}
            AND "latencyMs" IS NOT NULL
        ORDER BY 1
    `;
}

export function buildLatencySeries(
  rows: Awaited<ReturnType<typeof queryLatencyByMinute>>,
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

export async function getLatencyTimeSeries(
  targetId?: string,
): Promise<LatencyDataPoint[]> {
  const since = new Date(Date.now() - SIXTY_MINUTES_MS);
  const rows = await queryLatencyByMinute(since, targetId);
  return buildLatencySeries(rows);
}
