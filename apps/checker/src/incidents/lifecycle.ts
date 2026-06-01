import { prisma } from "../db/prisma";
import {
    CONSECUTIVE_DOWN_FOR_INCIDENT,
    CONSECUTIVE_UP_FOR_RESOLVE,
    RECENT_CHECKS_LOOKBACK,
    THIRTY_DAYS_MS,
} from "./constants";
import {
    buildIncidentDescription,
    buildIncidentTitle,
    countConsecutiveFromRecent,
    deriveSeverity,
    streakStartAt,
    type CheckSnapshot,
} from "./helpers";

export async function reconcileIncidentForTarget(
    targetId: string,
    targetName: string,
): Promise<void> {
    const recent = await prisma.healthCheck.findMany({
        where: { targetId },
        orderBy: { checkedAt: "desc" },
        take: RECENT_CHECKS_LOOKBACK,
        select: { status: true, checkedAt: true },
    });

    if (recent.length === 0) return;

    const snapshots: CheckSnapshot[] = recent;
    const consecutiveDown = countConsecutiveFromRecent(snapshots, "DOWN");
    const consecutiveUp = countConsecutiveFromRecent(snapshots, "UP");

    const openIncident = await prisma.incident.findFirst({
        where: { targetId, resolvedAt: null },
        orderBy: { startedAt: "desc" },
    });

    if (!openIncident) {
        if (consecutiveDown >= CONSECUTIVE_DOWN_FOR_INCIDENT) {
            const startedAt = streakStartAt(snapshots, "DOWN");
            if (!startedAt) return;

            await prisma.incident.create({
                data: {
                    targetId,
                    title: buildIncidentTitle(targetName),
                    severity: deriveSeverity(consecutiveDown),
                    description: buildIncidentDescription(consecutiveDown),
                    startedAt,
                    downCount: consecutiveDown,
                },
            });
        }
        return;
    }

    if (consecutiveUp >= CONSECUTIVE_UP_FOR_RESOLVE) {
        const resolvedAt = streakStartAt(snapshots, "UP");
        if (!resolvedAt) return;

        await prisma.incident.update({
            where: { id: openIncident.id },
            data: {
                resolvedAt,
                downCount: Math.max(openIncident.downCount, consecutiveDown),
                severity: deriveSeverity(
                    Math.max(openIncident.downCount, consecutiveDown),
                ),
                description: buildIncidentDescription(
                    Math.max(openIncident.downCount, consecutiveDown),
                ),
            },
        });
        return;
    }

    if (consecutiveDown > 0) {
        const downCount = Math.max(openIncident.downCount, consecutiveDown);
        await prisma.incident.update({
            where: { id: openIncident.id },
            data: {
                downCount,
                severity: deriveSeverity(downCount),
                description: buildIncidentDescription(downCount),
            },
        });
    }
}

export async function cleanupOldIncidents(): Promise<number> {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
    const result = await prisma.incident.deleteMany({
        where: {
            resolvedAt: { not: null, lt: cutoff },
        },
    });
    return result.count;
}
