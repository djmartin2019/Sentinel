import { prisma } from "../../db";

import type { UptimeDayRow, UptimeDataPoint } from "../../types";

import { computeUptimePercentFromCounts } from "../util/data-utils";

import { THIRTY_DAYS_MS } from "../shared/constants";

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function queryUptimeByDay(
  since: Date,
  targetId?: string,
): Promise<UptimeDayRow[]> {
  if (targetId) {
    return prisma.$queryRaw<UptimeDayRow[]>`
      SELECT
        date_trunc('day', "checkedAt") AS day,
        COUNT(*) FILTER (WHERE status = 'UP')::bigint AS up_count,
        COUNT(*)::bigint AS total
      FROM "HealthCheck"
      WHERE "checkedAt" >= ${since}
        AND "targetId" = ${targetId}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  return prisma.$queryRaw<UptimeDayRow[]>`
    SELECT
      date_trunc('day', "checkedAt") AS day,
      COUNT(*) FILTER (WHERE status = 'UP')::bigint AS up_count,
      COUNT(*)::bigint AS total
    FROM "HealthCheck"
    WHERE "checkedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
}

export function buildUptimeSeries(
  rows: Awaited<ReturnType<typeof queryUptimeByDay>>,
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

export async function getUptimeTimeSeries(
  targetId?: string,
): Promise<UptimeDataPoint[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const rows = await queryUptimeByDay(since, targetId);
  return buildUptimeSeries(rows);
}
