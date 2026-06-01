-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "downCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_resolvedAt_idx" ON "Incident"("resolvedAt");

-- CreateIndex
CREATE INDEX "Incident_targetId_resolvedAt_idx" ON "Incident"("targetId", "resolvedAt");

-- CreateIndex
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitoredTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
