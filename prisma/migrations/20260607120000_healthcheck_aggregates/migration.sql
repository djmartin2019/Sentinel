-- CreateTable
CREATE TABLE "HealthCheckAggregate5m" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upChecks" INTEGER NOT NULL,
    "downChecks" INTEGER NOT NULL,
    "avgLatencyMs" DOUBLE PRECISION,
    "minLatencyMs" INTEGER,
    "maxLatencyMs" INTEGER,
    "p95LatencyMs" INTEGER,
    "p99LatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCheckAggregate5m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheckAggregateHourly" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upChecks" INTEGER NOT NULL,
    "downChecks" INTEGER NOT NULL,
    "avgLatencyMs" DOUBLE PRECISION,
    "minLatencyMs" INTEGER,
    "maxLatencyMs" INTEGER,
    "p95LatencyMs" INTEGER,
    "p99LatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCheckAggregateHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheckAggregateDaily" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upChecks" INTEGER NOT NULL,
    "downChecks" INTEGER NOT NULL,
    "avgLatencyMs" DOUBLE PRECISION,
    "minLatencyMs" INTEGER,
    "maxLatencyMs" INTEGER,
    "p95LatencyMs" INTEGER,
    "p99LatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCheckAggregateDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthCheckAggregate5m_targetId_bucketStart_key" ON "HealthCheckAggregate5m"("targetId", "bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregate5m_bucketStart_idx" ON "HealthCheckAggregate5m"("bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregate5m_targetId_bucketStart_idx" ON "HealthCheckAggregate5m"("targetId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCheckAggregateHourly_targetId_bucketStart_key" ON "HealthCheckAggregateHourly"("targetId", "bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregateHourly_bucketStart_idx" ON "HealthCheckAggregateHourly"("bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregateHourly_targetId_bucketStart_idx" ON "HealthCheckAggregateHourly"("targetId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCheckAggregateDaily_targetId_bucketStart_key" ON "HealthCheckAggregateDaily"("targetId", "bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregateDaily_bucketStart_idx" ON "HealthCheckAggregateDaily"("bucketStart");

-- CreateIndex
CREATE INDEX "HealthCheckAggregateDaily_targetId_bucketStart_idx" ON "HealthCheckAggregateDaily"("targetId", "bucketStart");

-- AddForeignKey
ALTER TABLE "HealthCheckAggregate5m" ADD CONSTRAINT "HealthCheckAggregate5m_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitoredTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheckAggregateHourly" ADD CONSTRAINT "HealthCheckAggregateHourly_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitoredTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthCheckAggregateDaily" ADD CONSTRAINT "HealthCheckAggregateDaily_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitoredTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
