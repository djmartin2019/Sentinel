import type { MetricPayload } from "../types/telemetry.types.js";
import { sendMetrics } from "../grpc/telemetry.client.js";
import { TelemetryClient } from "../grpc/telemetry.client.js";

export type MetricCollector = () => Promise<MetricPayload>;

export function startMetricsScheduler(
  client: TelemetryClient,
  collectors: MetricCollector[],
  intervalMs: number,
  onSuccess?: (metrics: MetricPayload[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      const metrics = await Promise.all(collectors.map((collect) => collect()));
      const success = await sendMetrics(client, metrics);
      if (!success) {
        throw new Error("Collector returned success=false");
      }
      onSuccess?.(metrics);
    } catch (error) {
      onError?.(error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return () => clearInterval(timer);
}
