export type AggregateMode = "rolling" | "full";

export const RAW_RETENTION_DAYS = 7;
export const AGG_5M_RETENTION_DAYS = 14;
export const AGG_HOURLY_RETENTION_DAYS = 30;
export const AGG_DAILY_RETENTION_DAYS = 365;

const UPSERT_COLUMNS = `
  "totalChecks" = EXCLUDED."totalChecks",
  "upChecks" = EXCLUDED."upChecks",
  "downChecks" = EXCLUDED."downChecks",
  "avgLatencyMs" = EXCLUDED."avgLatencyMs",
  "minLatencyMs" = EXCLUDED."minLatencyMs",
  "maxLatencyMs" = EXCLUDED."maxLatencyMs",
  "p95LatencyMs" = EXCLUDED."p95LatencyMs",
  "p99LatencyMs" = EXCLUDED."p99LatencyMs",
  "updatedAt" = NOW()`;

function lookbackFilter(
    mode: AggregateMode,
    column: string,
    lookbackDays: number,
): string {
    if (mode === "full") {
        return "";
    }

    return `AND ${column} >= bounds.lookback_start`;
}

export function buildAggregate5mSql(mode: AggregateMode): string {
    const lookback = lookbackFilter(mode, 'hc."checkedAt"', RAW_RETENTION_DAYS);

    return `
INSERT INTO "HealthCheckAggregate5m" (
  "id",
  "targetId",
  "bucketStart",
  "totalChecks",
  "upChecks",
  "downChecks",
  "avgLatencyMs",
  "minLatencyMs",
  "maxLatencyMs",
  "p95LatencyMs",
  "p99LatencyMs",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  buckets."targetId",
  buckets."bucketStart",
  buckets."totalChecks",
  buckets."upChecks",
  buckets."downChecks",
  buckets."avgLatencyMs",
  buckets."minLatencyMs",
  buckets."maxLatencyMs",
  buckets."p95LatencyMs",
  buckets."p99LatencyMs",
  NOW(),
  NOW()
FROM (
  SELECT
    hc."targetId",
    (
      date_trunc('hour', hc."checkedAt")
      + floor(date_part('minute', hc."checkedAt") / 5) * interval '5 minutes'
    ) AS "bucketStart",
    COUNT(*)::int AS "totalChecks",
    COUNT(*) FILTER (WHERE hc."status" = 'UP')::int AS "upChecks",
    COUNT(*) FILTER (WHERE hc."status" = 'DOWN')::int AS "downChecks",
    AVG(hc."latencyMs") FILTER (WHERE hc."latencyMs" IS NOT NULL) AS "avgLatencyMs",
    MIN(hc."latencyMs") FILTER (WHERE hc."latencyMs" IS NOT NULL)::int AS "minLatencyMs",
    MAX(hc."latencyMs") FILTER (WHERE hc."latencyMs" IS NOT NULL)::int AS "maxLatencyMs",
    ROUND(
      percentile_cont(0.95) WITHIN GROUP (ORDER BY hc."latencyMs")
    )::int AS "p95LatencyMs",
    ROUND(
      percentile_cont(0.99) WITHIN GROUP (ORDER BY hc."latencyMs")
    )::int AS "p99LatencyMs"
  FROM "HealthCheck" hc
  CROSS JOIN (
    SELECT
      (
        date_trunc('hour', NOW())
        + floor(date_part('minute', NOW()) / 5) * interval '5 minutes'
      ) AS current_bucket,
      NOW() - (${RAW_RETENTION_DAYS} * interval '1 day') AS lookback_start
  ) bounds
  WHERE (
      date_trunc('hour', hc."checkedAt")
      + floor(date_part('minute', hc."checkedAt") / 5) * interval '5 minutes'
    ) < bounds.current_bucket
    ${lookback}
  GROUP BY hc."targetId", "bucketStart"
) buckets
ON CONFLICT ("targetId", "bucketStart") DO UPDATE SET
  ${UPSERT_COLUMNS}`;
}

export function buildAggregateHourlySql(mode: AggregateMode): string {
    const lookback = lookbackFilter(
        mode,
        'agg."bucketStart"',
        AGG_5M_RETENTION_DAYS,
    );

    return `
INSERT INTO "HealthCheckAggregateHourly" (
  "id",
  "targetId",
  "bucketStart",
  "totalChecks",
  "upChecks",
  "downChecks",
  "avgLatencyMs",
  "minLatencyMs",
  "maxLatencyMs",
  "p95LatencyMs",
  "p99LatencyMs",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  buckets."targetId",
  buckets."bucketStart",
  buckets."totalChecks",
  buckets."upChecks",
  buckets."downChecks",
  buckets."avgLatencyMs",
  buckets."minLatencyMs",
  buckets."maxLatencyMs",
  buckets."p95LatencyMs",
  buckets."p99LatencyMs",
  NOW(),
  NOW()
FROM (
  SELECT
    agg."targetId",
    date_trunc('hour', agg."bucketStart") AS "bucketStart",
    SUM(agg."totalChecks")::int AS "totalChecks",
    SUM(agg."upChecks")::int AS "upChecks",
    SUM(agg."downChecks")::int AS "downChecks",
    SUM(agg."avgLatencyMs" * agg."totalChecks")
      / NULLIF(SUM(agg."totalChecks") FILTER (WHERE agg."avgLatencyMs" IS NOT NULL), 0)
      AS "avgLatencyMs",
    MIN(agg."minLatencyMs")::int AS "minLatencyMs",
    MAX(agg."maxLatencyMs")::int AS "maxLatencyMs",
    MAX(agg."p95LatencyMs")::int AS "p95LatencyMs",
    MAX(agg."p99LatencyMs")::int AS "p99LatencyMs"
  FROM "HealthCheckAggregate5m" agg
  CROSS JOIN (
    SELECT
      date_trunc('hour', NOW()) AS current_bucket,
      NOW() - (${AGG_5M_RETENTION_DAYS} * interval '1 day') AS lookback_start
  ) bounds
  WHERE date_trunc('hour', agg."bucketStart") < bounds.current_bucket
    ${lookback}
  GROUP BY agg."targetId", date_trunc('hour', agg."bucketStart")
) buckets
ON CONFLICT ("targetId", "bucketStart") DO UPDATE SET
  ${UPSERT_COLUMNS}`;
}

export function buildAggregateDailySql(mode: AggregateMode): string {
    const lookback = lookbackFilter(
        mode,
        'agg."bucketStart"',
        AGG_HOURLY_RETENTION_DAYS,
    );

    return `
INSERT INTO "HealthCheckAggregateDaily" (
  "id",
  "targetId",
  "bucketStart",
  "totalChecks",
  "upChecks",
  "downChecks",
  "avgLatencyMs",
  "minLatencyMs",
  "maxLatencyMs",
  "p95LatencyMs",
  "p99LatencyMs",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  buckets."targetId",
  buckets."bucketStart",
  buckets."totalChecks",
  buckets."upChecks",
  buckets."downChecks",
  buckets."avgLatencyMs",
  buckets."minLatencyMs",
  buckets."maxLatencyMs",
  buckets."p95LatencyMs",
  buckets."p99LatencyMs",
  NOW(),
  NOW()
FROM (
  SELECT
    agg."targetId",
    date_trunc('day', agg."bucketStart") AS "bucketStart",
    SUM(agg."totalChecks")::int AS "totalChecks",
    SUM(agg."upChecks")::int AS "upChecks",
    SUM(agg."downChecks")::int AS "downChecks",
    SUM(agg."avgLatencyMs" * agg."totalChecks")
      / NULLIF(SUM(agg."totalChecks") FILTER (WHERE agg."avgLatencyMs" IS NOT NULL), 0)
      AS "avgLatencyMs",
    MIN(agg."minLatencyMs")::int AS "minLatencyMs",
    MAX(agg."maxLatencyMs")::int AS "maxLatencyMs",
    MAX(agg."p95LatencyMs")::int AS "p95LatencyMs",
    MAX(agg."p99LatencyMs")::int AS "p99LatencyMs"
  FROM "HealthCheckAggregateHourly" agg
  CROSS JOIN (
    SELECT
      date_trunc('day', NOW()) AS current_bucket,
      NOW() - (${AGG_HOURLY_RETENTION_DAYS} * interval '1 day') AS lookback_start
  ) bounds
  WHERE date_trunc('day', agg."bucketStart") < bounds.current_bucket
    ${lookback}
  GROUP BY agg."targetId", date_trunc('day', agg."bucketStart")
) buckets
ON CONFLICT ("targetId", "bucketStart") DO UPDATE SET
  ${UPSERT_COLUMNS}`;
}
