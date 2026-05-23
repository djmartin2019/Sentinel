import pino from "pino";

import {
  insertMetrics,
  type IncomingMetric,
} from "../db/repositories/metrics.repository";

const log = pino({
  name: "telemetry-service",
  level: process.env.LOG_LEVEL ?? "info",
});

export async function handleMetrics(
  metrics: IncomingMetric[],
): Promise<boolean> {
  await insertMetrics(metrics);
  log.info(
    { count: metrics.length, agentId: metrics[0]?.agentId },
    "Persisted metrics",
  );
  return true;
}
