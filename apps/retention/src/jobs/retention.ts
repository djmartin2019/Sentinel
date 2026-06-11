import { prisma } from "../db/prisma";
import { logger } from "../logger/logger";
import {
    AGG_5M_RETENTION_DAYS,
    AGG_DAILY_RETENTION_DAYS,
    AGG_HOURLY_RETENTION_DAYS,
    type AggregateMode,
    buildAggregate5mSql,
    buildAggregateDailySql,
    buildAggregateHourlySql,
    RAW_RETENTION_DAYS,
} from "./aggregate-sql";

export type { AggregateMode };

const PRUNE_RAW_SQL = `
DELETE FROM "HealthCheck"
WHERE "checkedAt" < NOW() - (${RAW_RETENTION_DAYS} * interval '1 day')`;

const PRUNE_5M_SQL = `
DELETE FROM "HealthCheckAggregate5m"
WHERE "bucketStart" < NOW() - (${AGG_5M_RETENTION_DAYS} * interval '1 day')`;

const PRUNE_HOURLY_SQL = `
DELETE FROM "HealthCheckAggregateHourly"
WHERE "bucketStart" < NOW() - (${AGG_HOURLY_RETENTION_DAYS} * interval '1 day')`;

const PRUNE_DAILY_SQL = `
DELETE FROM "HealthCheckAggregateDaily"
WHERE "bucketStart" < NOW() - (${AGG_DAILY_RETENTION_DAYS} * interval '1 day')`;

async function runSqlJob(name: string, sql: string): Promise<number> {
    const startedAt = Date.now();
    const affected = await prisma.$executeRawUnsafe(sql);

    logger.info(
        {
            job: name,
            affectedRows: affected,
            durationMs: Date.now() - startedAt,
        },
        "Retention job finished",
    );

    return affected;
}

export async function aggregate5m(
    options: { mode?: AggregateMode } = {},
): Promise<number> {
    const mode = options.mode ?? "rolling";
    return runSqlJob(`aggregate5m:${mode}`, buildAggregate5mSql(mode));
}

export async function aggregateHourly(
    options: { mode?: AggregateMode } = {},
): Promise<number> {
    const mode = options.mode ?? "rolling";
    return runSqlJob(`aggregateHourly:${mode}`, buildAggregateHourlySql(mode));
}

export async function aggregateDaily(
    options: { mode?: AggregateMode } = {},
): Promise<number> {
    const mode = options.mode ?? "rolling";
    return runSqlJob(`aggregateDaily:${mode}`, buildAggregateDailySql(mode));
}

export async function pruneRawChecks(): Promise<number> {
    return runSqlJob("pruneRawChecks", PRUNE_RAW_SQL);
}

export async function prune5mAggregates(): Promise<number> {
    return runSqlJob("prune5mAggregates", PRUNE_5M_SQL);
}

export async function pruneHourlyAggregates(): Promise<number> {
    return runSqlJob("pruneHourlyAggregates", PRUNE_HOURLY_SQL);
}

export async function pruneDailyAggregates(): Promise<number> {
    return runSqlJob("pruneDailyAggregates", PRUNE_DAILY_SQL);
}

export async function runRetentionCycle(): Promise<void> {
    const startedAt = Date.now();

    logger.info("Starting retention cycle");

    await aggregate5m();
    await aggregateHourly();
    await aggregateDaily();

    await pruneRawChecks();
    await prune5mAggregates();
    await pruneHourlyAggregates();
    await pruneDailyAggregates();

    logger.info(
        { durationMs: Date.now() - startedAt },
        "Retention cycle complete",
    );
}
