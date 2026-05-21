import { DEGRADED_LATENCY_MS } from "../shared/constants";

import type {
  LatestCheck,
  MonitoredTarget,
  PrismaCheckStatus,
  TargetStatus,
} from "../../types";

export function deriveDisplayStatus(
  prismaStatus: PrismaCheckStatus,
  latencyMs: number | null | undefined,
): TargetStatus {
  if (prismaStatus === "DOWN") return "DOWN";
  if ((latencyMs ?? 0) > DEGRADED_LATENCY_MS) return "DEGRADED";
  return "UP";
}

export function mapTargetRow(
  target: {
    id: string;
    name: string;
    url: string;
    interval: number;
    createdAt: Date;
  },
  latest: LatestCheck | undefined,
  uptime: number,
): MonitoredTarget {
  const latencyMs = latest?.latencyMs ?? 0;
  const status = latest
    ? deriveDisplayStatus(latest.status, latest.latencyMs)
    : "UP";

  return {
    id: target.id,
    name: target.name,
    url: target.url,
    interval: target.interval,
    status,
    latencyMs,
    uptime,
    lastChecked: (latest?.checkedAt ?? target.createdAt).toISOString(),
    region: "us-east-1",
    createdAt: target.createdAt.toISOString(),
    tags: [],
  };
}

export function computeUptimePercentFromCounts(
  up: number,
  total: number,
): number {
  if (total === 0) return 100;
  return parseFloat(((up / total) * 100).toFixed(2));
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1),
  );
  return sorted[idx]!;
}
