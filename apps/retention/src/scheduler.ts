import { runRetentionCycle } from "./jobs/retention";
import { logger } from "./logger/logger";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

let isRunning = false;

function parseIntervalMs(): number {
    const raw = process.env.RETENTION_INTERVAL_MS;
    if (!raw) {
        return DEFAULT_INTERVAL_MS;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        logger.warn(
            { value: raw },
            "Invalid RETENTION_INTERVAL_MS; using default 5 minutes",
        );
        return DEFAULT_INTERVAL_MS;
    }

    return parsed;
}

async function runCycleSafe(): Promise<void> {
    if (isRunning) {
        logger.warn("Retention cycle already running; skipping overlap");
        return;
    }

    isRunning = true;

    try {
        await runRetentionCycle();
    } catch (err) {
        logger.error({ err }, "Retention cycle failed");
    } finally {
        isRunning = false;
    }
}

export function startScheduler(): void {
    const intervalMs = parseIntervalMs();

    logger.info({ intervalMs }, "Starting retention scheduler");

    void runCycleSafe();

    setInterval(() => {
        void runCycleSafe();
    }, intervalMs);
}
