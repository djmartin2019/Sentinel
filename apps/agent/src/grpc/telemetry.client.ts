import path from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import type { MetricPayload } from "../types/telemetry.types.js";

const RPC_TIMEOUT_MS = Number(process.env.GRPC_RPC_TIMEOUT_MS ?? "5000");

const PROTO_PATH = path.resolve(
  process.cwd(),
  "../../packages/proto/telemetry.proto",
);

const loaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// Load proto ONCE when this file is imported
const packageDefinition = protoLoader.loadSync(PROTO_PATH, loaderOptions);
const telemetryPackage = grpc.loadPackageDefinition(packageDefinition)
  .telemetry as grpc.GrpcObject;
const TelemetryService =
  telemetryPackage.TelemetryService as grpc.ServiceClientConstructor;

export type TelemetryClient = grpc.Client & {
  SendMetrics: (
    request: { metrics: MetricPayload[] },
    options: grpc.CallOptions,
    callback: grpc.requestCallback<{ success: boolean }>,
  ) => void;
};

// Call once at startup
export function createTelemetryClient(collectorUrl: string): TelemetryClient {
  return new TelemetryService(collectorUrl, grpc.credentials.createInsecure(), {
    "grpc.keepalive_time_ms": 10_000,
    "grpc.keepalive_timeout_ms": 5_000,
    "grpc.keepalive_permit_without_calls": 1,
  }) as unknown as TelemetryClient;
}

// Reuse the same client on every tick
export async function sendMetrics(
  client: TelemetryClient,
  metrics: MetricPayload[],
): Promise<boolean> {
  const deadline = new Date(Date.now() + RPC_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    client.SendMetrics({ metrics }, { deadline }, (error, response) => {
      if (error) {
        reject(error); // DEADLINE_EXCEEDED if timed out
        return;
      }
      resolve(response?.success ?? false);
    });
  });
}

export function closeTelemtryClient(client: TelemetryClient): void {
  client.close();
}
