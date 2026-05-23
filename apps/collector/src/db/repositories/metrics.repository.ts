import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type IncomingMetric = {
  agentId: string;
  metricType: string;
  value: number;
  timestamp: number | string;
};

export async function insertMetrics(metrics: IncomingMetric[]): Promise<void> {
  if (metrics.length === 0) return;

  await prisma.telemetryMetric.createMany({
    data: metrics.map((metric) => ({
      agentId: metric.agentId,
      metricType: metric.metricType,
      value: metric.value,
      recordedAt: new Date(Number(metric.timestamp)),
    })),
  });
}
