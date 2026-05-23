import type { MetricPayload } from "../types/telemetry.types.js";
import { sendMetrics, type TelemetryClient } from "../grpc/telemetry.client.js";

const TICK_TIMEOUT_MS = Number(process.env.TICK_TIMEOUT_MS ?? "8000");

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`tick timed out after ${ms}ms`)), ms),
    ),
  ]);
}

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
      await withTimeout(
        (async () => {
          const metrics = await Promise.all(
            collectors.map((collect) => collect()),
          );
          const success = await sendMetrics(client, metrics);
          if (!success) throw new Error("Collector returned success=false");
          onSuccess?.(metrics);
        })(),
        TICK_TIMEOUT_MS,
      );
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
