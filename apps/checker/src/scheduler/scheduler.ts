import { runChecks } from "../services/checker.services";
import { logger } from "../logger/logger";

export function startScheduler() {
    logger.info("Starting scheduler");

    runChecks();

    setInterval(async () => {
        await runChecks();
    }, 30_000);
}
