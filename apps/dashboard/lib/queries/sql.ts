import { prisma } from "../db";

export type LatestCheckRow = {
  targetId: string;
  status: "UP" | "DOWN";
  latencyMs: number | null;
  checkedAt: Date;
};

export type UptimeDayRow = {
  day: Date;
  up_count: bigint;
  total: bigint;
};

export type LatencyMinuteRow = {
  minute: Date;
  latencyMs: number | null;
};

export async function queryLatestChecksByTarget(): Promise<LatestCheckRow[]> {
  return prisma.$queryRaw<LatestCheckRow[]>`
    SELECT DISTINCT ON ("targetId")
      "targetId",
      status,
      "latencyMs",
      "checkedAt"
    FROM "HealthCheck"
    ORDER BY "targetId", "checkedAt" DESC
  `;
}

export async function queryUptimeByDay(
  since: Date,
  targetId?: string
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

export async function queryLatencyByMinute(
  since: Date,
  targetId?: string
): Promise<LatencyMinuteRow[]> {
  if (targetId) {
    return prisma.$queryRaw<LatencyMinuteRow[]>`
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

  return prisma.$queryRaw<LatencyMinuteRow[]>`
    SELECT
      date_trunc('minute', "checkedAt") AS minute,
      "latencyMs"
    FROM "HealthCheck"
    WHERE "checkedAt" >= ${since}
      AND "latencyMs" IS NOT NULL
    ORDER BY 1
  `;
}
