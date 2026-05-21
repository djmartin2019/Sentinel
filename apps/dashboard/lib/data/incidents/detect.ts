import { prisma } from "../../db";

import { CONSECUTIVE_DOWN_FOR_INCIDENT } from "../shared/constants";

import { Incident } from "../../types";

async function getConsecutiveDownTargets():
    Promise<{ targetId: string; targetName: string, startedAt: Date; count: number}[]>
{
    const targets = await prisma.monitoredTarget.findMany({
        select: { id: true, name: true }
    });

    const perTarget = await Promise.all(
        targets.map(async (target) => {
            const recent = await prisma.healthCheck.findMany({
                where: { targetId: target.id },
                orderBy: { checkedAt: "desc" },
                take: CONSECUTIVE_DOWN_FOR_INCIDENT,
                select: { status: true, checkedAt: true },
            });
            if (
                recent.length >= CONSECUTIVE_DOWN_FOR_INCIDENT &&
                recent.every((c) => c.status === "DOWN")
            ) {
                return {
                    targetId: target.id,
                    targetName: target.name,
                    startedAt: recent[recent.length - 1]!.checkedAt,
                    count: recent.length,
                };
            }
            return null;
        }),
    );

    return perTarget.filter(
        (row): row is NonNullable<typeof row> => row !== null,
    );
}

export async function getRecentIncidents(): Promise<Incident[]> {
    const targets = await prisma.monitoredTarget.findMany({
        select: { id: true, name: true },
    });

    const perTarget = await Promise.all(
        targets.map(async (target) => {
            const recent = await prisma.healthCheck.findMany({
                where: { targetId: target.id },
                orderBy: { checkedAt: "desc" },
                take: CONSECUTIVE_DOWN_FOR_INCIDENT + 1,
                select: { status: true, checkedAt: true },
            });

            if (recent.length < CONSECUTIVE_DOWN_FOR_INCIDENT + 1) return null;

            const latest = recent[0]!;
            const previous = recent.slice(1, CONSECUTIVE_DOWN_FOR_INCIDENT + 1);

            if (
                latest.status === "UP" &&
                previous.every((c) => c.status === "DOWN")
            ) {
                return downTargetToIncident(
                    {
                        targetId: target.id,
                        targetName: target.name,
                        startedAt: previous[previous.length - 1]!.checkedAt,
                        count: previous.length,
                    },
                    true,
                    latest.checkedAt,
                );
            }
            return null;
        }),
    )

    return perTarget
        .filter((inc): inc is Incident => inc !== null)
        .sort(
            (a, b) =>
                new Date(b.resolvedAt ?? b.startedAt).getTime() -
                new Date(a.resolvedAt ?? a.startedAt).getTime(),
        );
}

function downTargetToIncident(
    row: { targetId: string; targetName: string; startedAt: Date; count: number },
    resolved: boolean,
    resolvedAt?: Date,
): Incident {
    const severity =
        row.count >= 5 ? "critical" : row.count >= 3 ? "warning" : "info";

    return {
        id: `inc_${row.targetId}_${resolved ? "resolved" : "active"}`,
        title: `${row.targetName} unreachable`,
        severity,
        targetId: row.targetId,
        targetName: row.targetName,
        startedAt: row.startedAt.toISOString(),
        resolvedAt: resolvedAt?.toISOString(),
        resolved,
        description: `Health check failed ${row.count} + consecutive times. Endpoint may be down or timing out.`,
    };
}

export async function getActiveIncidents(): Promise<Incident[]> {
    const down = await getConsecutiveDownTargets();
    return down.map((row) => downTargetToIncident(row, false));
}

