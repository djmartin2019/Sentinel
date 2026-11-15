import { prisma } from "../../db";

import type { ActivityEvent, TargetStatus } from "../../types";
import { DEGRADED_LATENCY_MS } from "../shared/constants";

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

type TransitionRow = {
  id: string;
  targetName: string;
  status: TargetStatus;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: Date;
};

/**
 * State changes only (UP ↔ DEGRADED ↔ DOWN) from raw checks in the last 7 days.
 * Routine passing checks are dropped so the feed is signal, not noise.
 */
export async function getActivityFeed(limit = 12): Promise<ActivityEvent[]> {
  const since = new Date(Date.now() - LOOKBACK_MS);

  const rows = await prisma.$queryRaw<TransitionRow[]>`
    WITH classified AS (
      SELECT hc.id,
             hc."targetId",
             hc."latencyMs",
             hc."errorMessage",
             hc."checkedAt",
             CASE
               WHEN hc.status = 'DOWN' THEN 'DOWN'
               WHEN COALESCE(hc."latencyMs", 0) > ${DEGRADED_LATENCY_MS} THEN 'DEGRADED'
               ELSE 'UP'
             END AS status
      FROM "HealthCheck" hc
      WHERE hc."checkedAt" >= ${since}
    ),
    transitions AS (
      SELECT c.*,
             LAG(c.status) OVER (PARTITION BY c."targetId" ORDER BY c."checkedAt") AS prev
      FROM classified c
    )
    SELECT t.id, mt.name AS "targetName", t.status, t."latencyMs", t."errorMessage", t."checkedAt"
    FROM transitions t
    JOIN "MonitoredTarget" mt ON mt.id = t."targetId"
    WHERE t.prev IS NOT NULL AND t.prev <> t.status
    ORDER BY t."checkedAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => {
    let type: ActivityEvent["type"];
    let message: string;
    if (row.status === "DOWN") {
      type = "incident";
      message = row.errorMessage ?? "Health check failed";
    } else if (row.status === "DEGRADED") {
      type = "alert";
      message = `Slow response · ${row.latencyMs}ms`;
    } else {
      type = "recovery";
      message = `Recovered · ${row.latencyMs ?? 0}ms`;
    }
    return {
      id: row.id,
      type,
      message,
      targetName: row.targetName,
      timestamp: row.checkedAt.toISOString(),
      status: row.status,
    };
  });
}
