-- CreateIndex
CREATE INDEX "HealthCheck_checkedAt_idx" ON "HealthCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "HealthCheck_targetId_checkedAt_idx" ON "HealthCheck"("targetId", "checkedAt" DESC);
