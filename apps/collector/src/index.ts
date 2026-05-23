import { config } from "dotenv";
import { existsSync } from "node:fs";
import path, { resolve } from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import pino from "pino";

import { handleMetrics } from "./services/telemetry.service.js";

const rootEnv = resolve(__dirname, "../../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const log = pino({ name: "collector", level: process.env.LOG_LEVEL ?? "info" });

const PROTO_PATH = path.resolve(
  process.cwd(),
  "../../packages/proto/telemetry.proto",
);

const host = process.env.GRPC_HOST ?? "0.0.0.0";
const port = Number(process.env.GRPC_PORT ?? "50051");

type MetricMessage = {
  agentId: string;
  metricType: string;
  value: number;
  timestamp: number;
};

async function main() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const telemetryProto = grpc.loadPackageDefinition(packageDefinition)
    .telemetry as grpc.GrpcObject;

  const server = new grpc.Server();

  server.addService(
    (telemetryProto.TelemetryService as grpc.ServiceClientConstructor).service,
    {
      SendMetrics: (
        call: grpc.ServerUnaryCall<{ metrics?: MetricMessage[] }, { success: boolean }>,
        callback: grpc.sendUnaryData<{ success: boolean }>,
      ) => {
        void handleMetrics(call.request.metrics ?? [])
          .then((success) => callback(null, { success }))
          .catch((error: unknown) => {
            log.error({ err: error }, "SendMetrics failed");
            callback(error as grpc.ServiceError, null);
          });
      },
    },
  );

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `${host}:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          reject(error);
          return;
        }
        log.info({ host, port: boundPort }, "Collector gRPC server listening");
        resolve();
      },
    );
  });
}

main().catch((error) => {
  log.fatal({ err: error }, "Collector failed to start");
  process.exit(1);
});
