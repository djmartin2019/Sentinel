import { prisma } from "../../db";

import type { DailyUptimeBucket } from "../../types";
import { computeUptimePercentFromCounts } from "../util/data-utils";

const DAY_MS = 24 * 60 * 60 * 1000;
// Raw HealthCheck rows are kept for 7 days (see apps/retention).
const RAW_LOOKBACK_DAYS = 7;

type Counts = { up: number; total: number };

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Per-target daily uptime for the last `days` UTC days (oldest → newest, today last).
 *
 * Completed days come from HealthCheckAggregateDaily. Recent days the rollup
 * hasn't reached yet (always today, sometimes yesterday) fall back to raw checks.
 */
export async function loadDailyUptimeByTarget(
  days = 90,
): Promise<Map<string, DailyUptimeBucket[]>> {
  const today = startOfUtcDay(new Date());
  const since = new Date(today.getTime() - (days - 1) * DAY_MS);
  const rawSince = new Date(today.getTime() - (RAW_LOOKBACK_DAYS - 1) * DAY_MS);

  const [aggRows, rawRows] = await Promise.all([
    prisma.healthCheckAggregateDaily.findMany({
      where: { bucketStart: { gte: since } },
      select: { targetId: true, bucketStart: true, upChecks: true, totalChecks: true },
    }),
    prisma.$queryRaw<
      { targetId: string; day: Date; up: bigint; total: bigint }[]
    >`
      SELECT "targetId",
             date_trunc('day', "checkedAt") AS day,
             COUNT(*) FILTER (WHERE status = 'UP') AS up,
             COUNT(*) AS total
      FROM "HealthCheck"
      WHERE "checkedAt" >= ${rawSince}
      GROUP BY "targetId", date_trunc('day', "checkedAt")
    `,
  ]);

  // targetId -> day -> counts. Aggregates win; raw fills the gaps.
  const counts = new Map<string, Map<string, Counts>>();
  const bucketFor = (targetId: string) => {
    let m = counts.get(targetId);
    if (!m) counts.set(targetId, (m = new Map()));
    return m;
  };

  for (const r of aggRows) {
    bucketFor(r.targetId).set(dayKey(r.bucketStart), {
      up: r.upChecks,
      total: r.totalChecks,
    });
  }
  for (const r of rawRows) {
    const m = bucketFor(r.targetId);
    const key = dayKey(r.day);
    if (!m.has(key)) m.set(key, { up: Number(r.up), total: Number(r.total) });
  }

  const dayKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    dayKeys.push(dayKey(new Date(since.getTime() + i * DAY_MS)));
  }

  const result = new Map<string, DailyUptimeBucket[]>();
  for (const [targetId, byDay] of counts) {
    result.set(
      targetId,
      dayKeys.map((day) => {
        const c = byDay.get(day);
        return {
          day,
          checks: c?.total ?? 0,
          uptime: c && c.total > 0 ? computeUptimePercentFromCounts(c.up, c.total) : null,
        };
      }),
    );
  }
  return result;
}

/** Empty series (all "no data") for targets with no history yet. */
export function emptyDailySeries(days = 90): DailyUptimeBucket[] {
  const today = startOfUtcDay(new Date());
  return Array.from({ length: days }, (_, i) => ({
    day: dayKey(new Date(today.getTime() - (days - 1 - i) * DAY_MS)),
    checks: 0,
    uptime: null,
  }));
}
