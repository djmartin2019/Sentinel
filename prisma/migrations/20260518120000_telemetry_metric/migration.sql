-- CreateTable
CREATE TABLE "TelemetryMetric" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryMetric_agentId_metricType_recordedAt_idx" ON "TelemetryMetric"("agentId", "metricType", "recordedAt");
