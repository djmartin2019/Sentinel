import pino from "pino";

export const logger =
    process.env.NODE_ENV === "production"
        ? pino({ level: process.env.LOG_LEVEL ?? "info" })
        : pino({
              transport: {
                  target: "pino-pretty",
              },
          });
