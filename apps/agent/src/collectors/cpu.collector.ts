import si from "systeminformation";

import type { MetricPayload } from "../types/telemetry.types.js";

export async function collectCpuMetric(): Promise<MetricPayload> {
  const load = await si.currentLoad();

  return {
    agentId: process.env.AGENT_ID || "unknown-agent",
    metricType: "cpu",
    value: Number(load.currentLoad.toFixed(2)),
    timestamp: Date.now(),
  };
}
