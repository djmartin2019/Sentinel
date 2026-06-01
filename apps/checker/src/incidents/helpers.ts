import type { CheckStatus } from "@prisma/client";

export type CheckSnapshot = {
    status: CheckStatus;
    checkedAt: Date;
};

export type IncidentSeverity = "critical" | "warning" | "info";

export function deriveSeverity(downCount: number): IncidentSeverity {
    if (downCount >= 5) return "critical";
    if (downCount >= 3) return "warning";
    return "info";
}

export function buildIncidentTitle(targetName: string): string {
    return `${targetName} unreachable`;
}

export function buildIncidentDescription(downCount: number): string {
    return `Health check failed ${downCount} consecutive times. Endpoint may be down or timing out.`;
}

export function countConsecutiveFromRecent(
    checks: CheckSnapshot[],
    status: CheckStatus,
): number {
    let count = 0;
    for (const check of checks) {
        if (check.status !== status) break;
        count++;
    }
    return count;
}

/** Oldest timestamp in the leading same-status streak (checks newest-first). */
export function streakStartAt(
    checks: CheckSnapshot[],
    status: CheckStatus,
): Date | null {
    let start: Date | null = null;
    for (const check of checks) {
        if (check.status !== status) break;
        start = check.checkedAt;
    }
    return start;
}
