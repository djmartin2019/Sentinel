import { prisma } from "../../db";
import type { HealthCheck, MonitoredTarget } from "../../types";

import { mapTargetRow } from "../util/data-utils";

import { THIRTY_DAYS_MS } from "../shared/constants";
import { loadUptimePercentForTarget } from "./uptime-percent-rollup";

export async function getTargetById(
  id: string,
): Promise<(MonitoredTarget & { checks: HealthCheck[] }) | null> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const target = await prisma.monitoredTarget.findUnique({
    where: { id },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!target) return null;

  const uptime = await loadUptimePercentForTarget(since, id);
  const latest = target.checks[0];
  const mapped = mapTargetRow(
    target,
    latest
      ? {
          status: latest.status,
          latencyMs: latest.latencyMs,
          checkedAt: latest.checkedAt,
        }
      : undefined,
    uptime,
  );

  return {
    ...mapped,
    checks: target.checks.map((c) => ({
      id: c.id,
      targetId: c.targetId,
      status: c.status,
      statusCode: c.statusCode ?? undefined,
      latencyMs: c.latencyMs ?? undefined,
      errorMessage: c.errorMessage ?? undefined,
      checkedAt: c.checkedAt.toISOString(),
    })),
  };
}

export async function getRecentChecks(
  targetId: string,
): Promise<HealthCheck[]> {
  const checks = await prisma.healthCheck.findMany({
    where: { targetId },
    orderBy: { checkedAt: "desc" },
    take: 50,
  });

  return checks.map((c) => ({
    id: c.id,
    targetId: c.targetId,
    status: c.status,
    statusCode: c.statusCode ?? undefined,
    latencyMs: c.latencyMs ?? undefined,
    errorMessage: c.errorMessage ?? undefined,
    checkedAt: c.checkedAt.toISOString(),
  }));
}
