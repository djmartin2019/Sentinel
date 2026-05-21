import { prisma } from "../../db";

import type { PrismaCheckStatus } from "../../types";

import { computeUptimePercentFromCounts } from "../util/data-utils";

function uptimeMapFromGroupBy(
  groups: {
    targetId: string;
    status: PrismaCheckStatus;
    _count: { _all: number };
  }[],
): Map<string, number> {
  const totals = new Map<string, { up: number; total: number }>();
  for (const row of groups) {
    const entry = totals.get(row.targetId) ?? { up: 0, total: 0 };
    const count = row._count._all;
    entry.total += count;
    if (row.status === "UP") entry.up += count;
    totals.set(row.targetId, entry);
  }

  const uptime = new Map<string, number>();
  for (const [targetId, { up, total }] of totals) {
    uptime.set(targetId, computeUptimePercentFromCounts(up, total));
  }
  return uptime;
}

export async function loadUptimePercentByTarget(
  since: Date,
): Promise<Map<string, number>> {
  const groups = await prisma.healthCheck.groupBy({
    by: ["targetId", "status"],
    where: { checkedAt: { gte: since } },
    _count: { _all: true },
  });
  return uptimeMapFromGroupBy(groups);
}

export async function loadUptimePercentForTarget(
  since: Date,
  targetId: string,
): Promise<number> {
  const groups = await prisma.healthCheck.groupBy({
    by: ["status"],
    where: { checkedAt: { gte: since }, targetId },
    _count: { _all: true },
  });

  let up = 0;
  let total = 0;
  for (const row of groups) {
    const count = row._count._all;
    total += count;
    if (row.status === "UP") up += count;
  }
  return computeUptimePercentFromCounts(up, total);
}
