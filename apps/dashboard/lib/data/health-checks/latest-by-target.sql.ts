import { prisma } from "../../db";
import type { LatestCheck, LatestCheckRow } from "../../types";

async function queryLatestChecksByTarget(): Promise<LatestCheckRow[]> {
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

export async function loadLatestChecksByTarget(): Promise<Map<string, LatestCheck>> {
  const rows = await queryLatestChecksByTarget();
  const latest = new Map<string, LatestCheck>();
  for (const row of rows) {
    latest.set(row.targetId, {
      status: row.status,
      latencyMs: row.latencyMs,
      checkedAt: row.checkedAt,
    });
  }
  return latest;
}
