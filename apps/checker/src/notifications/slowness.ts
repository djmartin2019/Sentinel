import { prisma } from "../db/prisma";
import {
    CONSECUTIVE_SLOW_FOR_ALERT,
    SLOW_LATENCY_MS,
} from "../incidents/constants";
import { notify, formatDuration } from "./push";

type RecentCheck = { status: "UP" | "DOWN"; latencyMs: number | null; checkedAt: Date };

function isSlow(check: RecentCheck): boolean {
    return check.status === "UP" && (check.latencyMs ?? 0) > SLOW_LATENCY_MS;
}

/**
 * Alert once when a target has been reachable-but-slow for
 * CONSECUTIVE_SLOW_FOR_ALERT checks in a row; re-arm silently once it's fast again.
 * Outages are covered by incidents, so DOWN checks break the slow streak.
 */
export async function reconcileSlownessForTarget(
    targetId: string,
    targetName: string,
): Promise<void> {
    const recent: RecentCheck[] = await prisma.healthCheck.findMany({
        where: { targetId },
        orderBy: { checkedAt: "desc" },
        take: CONSECUTIVE_SLOW_FOR_ALERT,
        select: { status: true, latencyMs: true, checkedAt: true },
    });
    if (recent.length === 0) return;

    const state = await prisma.targetAlertState.findUnique({ where: { targetId } });
    const slowActive = state?.slowActive ?? false;

    const streak: RecentCheck[] = [];
    for (const c of recent) {
        if (!isSlow(c)) break;
        streak.push(c);
    }

    if (!slowActive && streak.length >= CONSECUTIVE_SLOW_FOR_ALERT) {
        await prisma.targetAlertState.upsert({
            where: { targetId },
            create: { targetId, slowActive: true },
            update: { slowActive: true },
        });

        const avg = Math.round(
            streak.reduce((sum, c) => sum + (c.latencyMs ?? 0), 0) / streak.length,
        );
        const oldest = streak[streak.length - 1]!.checkedAt;
        await notify({
            title: `🟡 ${targetName} is slow`,
            body: `Avg ${avg >= 1000 ? `${(avg / 1000).toFixed(1)}s` : `${avg}ms`} for ${formatDuration(Date.now() - oldest.getTime())}`,
            url: `/target/${targetId}`,
            tag: `slow-${targetId}`,
        });
        return;
    }

    if (slowActive && !isSlow(recent[0]!)) {
        await prisma.targetAlertState.update({
            where: { targetId },
            data: { slowActive: false },
        });
    }
}
