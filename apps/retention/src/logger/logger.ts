import pino from "pino";

export const logger =
    process.env.NODE_ENV === "production"
        ? pino({ name: "retention", level: process.env.LOG_LEVEL ?? "info" })
        : pino({
              name: "retention",
              level: process.env.LOG_LEVEL ?? "info",
              transport: {
                  target: "pino-pretty",
              },
          });
