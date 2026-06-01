import { prisma } from "../db/prisma";
import { logger } from "../logger/logger";
import { httpCheck } from "../checks/httpCheck";
import {
    cleanupOldIncidents,
    reconcileIncidentForTarget,
} from "../incidents/lifecycle";

export async function runChecks() {
    logger.info("Starting check cycle");

    const targets = await prisma.monitoredTarget.findMany();

    for (const target of targets) {
        logger.info(`Checking ${target.url}`);

        const result = await httpCheck(target.url);

        await prisma.healthCheck.create({
            data: {
                targetId: target.id,
                status: result.status,
                statusCode: result.statusCode,
                latencyMs: result.latencyMs,
                errorMessage: result.errorMessage,
            },
        });

        await reconcileIncidentForTarget(target.id, target.name);

        logger.info({
            target: target.url,
            status: result.status,
            latencyMs: result.latencyMs,
        });
    }

    const deleted = await cleanupOldIncidents();
    if (deleted > 0) {
        logger.info({ deleted }, "Cleaned up old resolved incidents");
    }

    logger.info("Check cycle complete");
}
