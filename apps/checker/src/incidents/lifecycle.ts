import { prisma } from "../db/prisma";
import {
    CONSECUTIVE_DOWN_FOR_INCIDENT,
    CONSECUTIVE_UP_FOR_RESOLVE,
    RECENT_CHECKS_LOOKBACK,
    THIRTY_DAYS_MS,
} from "./constants";
import { formatDuration, notify } from "../notifications/push";
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

            const incident = await prisma.incident.create({
                data: {
                    targetId,
                    title: buildIncidentTitle(targetName),
                    severity: deriveSeverity(consecutiveDown),
                    description: buildIncidentDescription(consecutiveDown),
                    startedAt,
                    downCount: consecutiveDown,
                },
            });

            await notify({
                title: `🔴 ${targetName} is down`,
                body: `Failed ${consecutiveDown} checks in a row · since ${formatClock(startedAt)}`,
                url: `/target/${targetId}`,
                tag: `incident-${incident.id}`,
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

        await notify({
            title: `✅ ${targetName} recovered`,
            body: `Down for ${formatDuration(resolvedAt.getTime() - openIncident.startedAt.getTime())}`,
            url: `/target/${targetId}`,
            tag: `incident-${openIncident.id}`,
        });
        return;
    }

    if (consecutiveDown > 0) {
        const downCount = Math.max(openIncident.downCount, consecutiveDown);
        const severity = deriveSeverity(downCount);
        await prisma.incident.update({
            where: { id: openIncident.id },
            data: {
                downCount,
                severity,
                description: buildIncidentDescription(downCount),
            },
        });

        if (severity === "critical" && openIncident.severity !== "critical") {
            await notify({
                title: `🔴 ${targetName} still down — critical`,
                body: `Failed ${downCount} checks · down ${formatDuration(Date.now() - openIncident.startedAt.getTime())}`,
                url: `/target/${targetId}`,
                tag: `incident-${openIncident.id}`,
            });
        }
    }
}

function formatClock(d: Date): string {
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: process.env.ALERT_TIMEZONE || "America/Chicago",
    });
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
