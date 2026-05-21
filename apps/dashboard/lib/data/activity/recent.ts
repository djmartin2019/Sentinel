import { prisma } from "../../db";

import { deriveDisplayStatus } from "../util/data-utils";

import { ActivityEvent } from "../../types";

export async function getActivityFeed(): Promise<ActivityEvent[]> {
    const checks = await prisma.healthCheck.findMany({
        orderBy: { checkedAt: "desc" },
        take: 20,
        include: { target: { select: { name: true } } },
    });

    return checks.map((check) => {
        const displayStatus = deriveDisplayStatus(check.status, check.latencyMs);
        const isDown = check.status === "DOWN";
        const isSlow = displayStatus === "DEGRADED";

        let type: ActivityEvent["type"] = "check";
        if (isDown) type = "incident";
        else if (isSlow) type = "alert";

        let message: string;
        if (isDown) {
            message = check.errorMessage ?? "Health check failed";
        } else if (isSlow) {
            message = `Elevated latency - ${check.latencyMs}ms`;
        } else {
            message = `Health check passed - ${check.latencyMs ?? 0}ms`;
        }

        return {
            id: check.id,
            type,
            message,
            targetName: check.target.name,
            timestamp: check.checkedAt.toISOString(),
            status: displayStatus,
        };
    });
}
