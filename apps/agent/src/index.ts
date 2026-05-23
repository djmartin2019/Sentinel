import pino from "pino";

import { collectCpuMetric } from "./collectors/cpu.collector.js";
import { startMetricsScheduler } from "./scheduler/scheduler.js";
import {
  createTelemetryClient,
  closeTelemtryClient,
} from "./grpc/telemetry.client.js";

const log = pino({
  name: "agent",
  level: process.env.LOG_LEVEL ?? "info",
});

const collectorUrl = process.env.COLLECTOR_GRPC_URL ?? "127.0.0.1:50051";
const client = createTelemetryClient(collectorUrl);

const intervalMs = Number(process.env.METRICS_INTERVAL_MS ?? "10000");
const agentId = process.env.AGENT_ID ?? "local-agent";

log.info({ collectorUrl, intervalMs, agentId }, "Starting telemetry agent");

const stop = startMetricsScheduler(
  client,
  [collectCpuMetric],
  intervalMs,
  (metrics) => log.info({ metrics }, "Metrics sent"),
  (error) => log.error({ err: error }, "Failed to send metrics"),
);

process.on("SIGTERM", () => {
  stop();
  closeTelemtryClient(client);
});
