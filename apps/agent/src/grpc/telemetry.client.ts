import path from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import type { MetricPayload } from "../types/telemetry.types.js";

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
    callback: grpc.requestCallback<{ success: boolean }>,
  ) => void;
};

// Call once at startup
export function createTelemetryClient(collectorUrl: string): TelemetryClient {
  return new TelemetryService(
    collectorUrl,
    grpc.credentials.createInsecure(),
  ) as unknown as TelemetryClient;
}

// Reuse the same client on every tick
export async function sendMetrics(
  client: TelemetryClient,
  metrics: MetricPayload[],
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    client.SendMetrics({ metrics }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response?.success ?? false);
    });
  });
}

export function closeTelemtryClient(client: TelemetryClient): void {
  client.close();
}
