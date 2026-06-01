import type { CheckStatus } from "@prisma/client";
import {
    CONSECUTIVE_DOWN_FOR_INCIDENT,
    CONSECUTIVE_UP_FOR_RESOLVE,
} from "./constants";
import {
    buildIncidentDescription,
    buildIncidentTitle,
    countConsecutiveFromRecent,
    deriveSeverity,
    streakStartAt,
    type CheckSnapshot,
} from "./helpers";

export type ReplayIncidentDraft = {
    targetId: string;
    title: string;
    severity: string;
    description: string;
    startedAt: Date;
    resolvedAt: Date | null;
    downCount: number;
};

type OpenDraft = Omit<ReplayIncidentDraft, "resolvedAt"> & { resolvedAt: null };

/**
 * Replays health checks (oldest-first) and returns incident drafts to persist.
 */
export function replayIncidentsFromChecks(
    targetId: string,
    targetName: string,
    checks: { status: CheckStatus; checkedAt: Date }[],
): ReplayIncidentDraft[] {
    const incidents: ReplayIncidentDraft[] = [];
    let open: OpenDraft | null = null;
    const recentNewestFirst: CheckSnapshot[] = [];

    for (const check of checks) {
        recentNewestFirst.unshift({
            status: check.status,
            checkedAt: check.checkedAt,
        });
        if (recentNewestFirst.length > 10) {
            recentNewestFirst.pop();
        }

        const consecutiveDown = countConsecutiveFromRecent(
            recentNewestFirst,
            "DOWN",
        );
        const consecutiveUp = countConsecutiveFromRecent(
            recentNewestFirst,
            "UP",
        );

        if (!open) {
            if (consecutiveDown >= CONSECUTIVE_DOWN_FOR_INCIDENT) {
                const startedAt = streakStartAt(recentNewestFirst, "DOWN");
                if (!startedAt) continue;

                open = {
                    targetId,
                    title: buildIncidentTitle(targetName),
                    severity: deriveSeverity(consecutiveDown),
                    description: buildIncidentDescription(consecutiveDown),
                    startedAt,
                    downCount: consecutiveDown,
                    resolvedAt: null,
                };
            }
            continue;
        }

        if (consecutiveUp >= CONSECUTIVE_UP_FOR_RESOLVE) {
            const resolvedAt = streakStartAt(recentNewestFirst, "UP");
            if (!resolvedAt) continue;

            const downCount = Math.max(open.downCount, consecutiveDown);
            incidents.push({
                ...open,
                downCount,
                severity: deriveSeverity(downCount),
                description: buildIncidentDescription(downCount),
                resolvedAt,
            });
            open = null;
            continue;
        }

        if (consecutiveDown > 0) {
            open.downCount = Math.max(open.downCount, consecutiveDown);
            open.severity = deriveSeverity(open.downCount);
            open.description = buildIncidentDescription(open.downCount);
        }
    }

    if (open) {
        incidents.push({ ...open, resolvedAt: null });
    }

    return incidents;
}
