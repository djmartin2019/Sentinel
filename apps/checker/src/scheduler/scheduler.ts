import { runChecks } from "../services/checker.service";
import { logger } from "../logger/logger";

function runChecksSafe() {
    runChecks().catch((err) => {
        logger.error({ err }, "Check cycle failed");
    });
}

export function startScheduler() {
    logger.info("Starting scheduler");

    runChecksSafe();

    setInterval(runChecksSafe, 60_000);
}
