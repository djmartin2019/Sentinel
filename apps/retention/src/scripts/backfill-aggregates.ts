import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const rootEnv = resolve(__dirname, "../../../../.env");
if (existsSync(rootEnv)) {
    config({ path: rootEnv });
}

import { prisma } from "../db/prisma";
import { logger } from "../logger/logger";
import {
    aggregate5m,
    aggregateDaily,
    aggregateHourly,
} from "../jobs/retention";

type TableCounts = {
    rawChecks: number;
    aggregates5m: number;
    aggregatesHourly: number;
    aggregatesDaily: number;
};

async function readTableCounts(): Promise<TableCounts> {
    const [rawChecks, aggregates5m, aggregatesHourly, aggregatesDaily] =
        await Promise.all([
            prisma.healthCheck.count(),
            prisma.healthCheckAggregate5m.count(),
            prisma.healthCheckAggregateHourly.count(),
            prisma.healthCheckAggregateDaily.count(),
        ]);

    return {
        rawChecks,
        aggregates5m,
        aggregatesHourly,
        aggregatesDaily,
    };
}

async function main() {
    const startedAt = Date.now();
    const before = await readTableCounts();

    logger.info({ counts: before }, "Starting aggregate backfill");

    const affected5m = await aggregate5m({ mode: "full" });
    const affectedHourly = await aggregateHourly({ mode: "full" });
    const affectedDaily = await aggregateDaily({ mode: "full" });

    const after = await readTableCounts();

    logger.info(
        {
            affectedRows: {
                aggregate5m: affected5m,
                aggregateHourly: affectedHourly,
                aggregateDaily: affectedDaily,
            },
            countsBefore: before,
            countsAfter: after,
            durationMs: Date.now() - startedAt,
        },
        "Aggregate backfill complete",
    );
}

main()
    .catch((err) => {
        logger.error({ err }, "Aggregate backfill failed");
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
